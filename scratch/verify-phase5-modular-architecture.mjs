/**
 * Verification Suite for Phase 5.1: Modular Platform Architecture & Extensibility
 * Tests:
 * 1. Domain boundaries (13 domains)
 * 2. Transactional outbox & event bus
 * 3. Idempotent consumption & DLQ routing + safe replay
 * 4. Plugin sandbox, capability gating, field masking & rate limiting
 * 5. Feature flag governance, regional targeting & kill-switch audit trail
 */

import { PLATFORM_DOMAINS } from "../src/lib/platform/domain-boundaries.ts";
import { PlatformEventBus } from "../src/lib/platform/event-bus.ts";
import { PluginRegistry, PluginSecurityViolationError, PluginRateLimitExceededError } from "../src/lib/platform/plugin-registry.ts";
import { FeatureFlagsEngine } from "../src/lib/admin/feature-flags-engine.ts";

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(message);
  }
  passedTests++;
  console.log(`✅ PASS: ${message}`);
}

async function runTests() {
  console.log("\n=======================================================");
  console.log("   SPECFORGE PHASE 5.1 VERIFICATION SUITE              ");
  console.log("   MODULAR PLATFORM ARCHITECTURE & EXTENSIBILITY      ");
  console.log("=======================================================\n");

  // TEST SUITE 1: Modular Domain Boundaries
  console.log("--- TEST SUITE 1: 13 Core Domain Boundaries ---");
  const expectedDomains = [
    "identity_access",
    "workspace_tenant",
    "client_project",
    "discovery_requirements",
    "estimation",
    "proposal_approval",
    "task_delivery",
    "change_control",
    "billing_usage",
    "integrations",
    "analytics",
    "notifications",
    "admin_support"
  ];

  assert(
    Object.keys(PLATFORM_DOMAINS).length === 13,
    `All 13 core platform domains defined (Found: ${Object.keys(PLATFORM_DOMAINS).length})`
  );

  for (const domain of expectedDomains) {
    const def = PLATFORM_DOMAINS[domain];
    assert(def !== undefined, `Domain '${domain}' is registered in PLATFORM_DOMAINS`);
    assert(def.ownerTeam.length > 0, `Domain '${domain}' specifies owner team: ${def.ownerTeam}`);
    assert(def.primaryEntities.length > 0, `Domain '${domain}' defines primary entities`);
    assert(def.apiBaseRoutes.length > 0, `Domain '${domain}' defines API routes`);
    assert(def.slaTargetMs > 0, `Domain '${domain}' specifies SLA target (${def.slaTargetMs}ms)`);
    assert(def.availabilityTarget >= 99.0, `Domain '${domain}' specifies availability target (${def.availabilityTarget}%)`);
  }

  // TEST SUITE 2: Transactional Outbox Pattern & Event-Driven Bus
  console.log("\n--- TEST SUITE 2: Transactional Outbox & Event-Driven Bus ---");
  PlatformEventBus.clear();

  const testOrgId = "ws_test_enterprise_01";
  const testUserId = "usr_lead_architect";

  // Publish proposal.approved event
  const outboxEvt1 = PlatformEventBus.publish({
    domain: "proposal_approval",
    eventName: "proposal.approved",
    aggregateId: "prop_99182",
    aggregateType: "Proposal",
    payload: {
      proposalId: "prop_99182",
      clientEmail: "cto@clientcorp.com",
      approvedTotalUSD: 45000,
      scopeVersion: 3
    },
    workspaceId: testOrgId,
    userId: testUserId,
    idempotencyKey: "idem_evt_prop_approved_1001"
  });

  assert(outboxEvt1.status === "PENDING", "Outbox event starts in PENDING status");
  assert(outboxEvt1.version === 1, "Default event version is 1");
  assert(outboxEvt1.id.startsWith("evt_"), "Event generated valid prefixed ID");

  // Idempotent Deduplication Check
  const outboxEvt1Dup = PlatformEventBus.publish({
    domain: "proposal_approval",
    eventName: "proposal.approved",
    aggregateId: "prop_99182",
    aggregateType: "Proposal",
    payload: { different: "should_be_ignored" },
    workspaceId: testOrgId,
    userId: testUserId,
    idempotencyKey: "idem_evt_prop_approved_1001"
  });

  assert(outboxEvt1Dup.id === outboxEvt1.id, "Idempotency prevents duplicate outbox records");

  // Register Decoupled Domain Subscribers
  let taskDeliveryReceived = 0;
  let billingReceived = 0;

  PlatformEventBus.subscribe({
    subscriberId: "task_delivery_auto_generator",
    domain: "task_delivery",
    eventNames: ["proposal.approved"],
    handler: async (evt) => {
      taskDeliveryReceived++;
    }
  });

  PlatformEventBus.subscribe({
    subscriberId: "billing_milestone_activator",
    domain: "billing_usage",
    eventNames: ["proposal.approved"],
    handler: async (evt) => {
      billingReceived++;
    }
  });

  // Dispatch Outbox
  const dispatchRes1 = await PlatformEventBus.dispatchPending(10);
  assert(dispatchRes1.processed === 1, `Outbox dispatch processed 1 pending event`);
  assert(dispatchRes1.succeeded === 1, `Outbox dispatch succeeded for event`);
  assert(taskDeliveryReceived === 1, "Task delivery subscriber received proposal.approved");
  assert(billingReceived === 1, "Billing subscriber received proposal.approved");

  // Test Consumer Idempotency: Dispatching again should not re-execute successful consumers
  const dispatchRes2 = await PlatformEventBus.dispatchPending(10);
  assert(dispatchRes2.processed === 0, "No pending events to dispatch");
  assert(taskDeliveryReceived === 1, "Task delivery subscriber not re-executed");
  assert(billingReceived === 1, "Billing subscriber not re-executed");

  // TEST SUITE 3: Dead-Letter Queue (DLQ) & Safe Replay
  console.log("\n--- TEST SUITE 3: Retry Backoff, DLQ & Safe Replay ---");

  let flakyAttempts = 0;
  let simulateFix = false;

  PlatformEventBus.subscribe({
    subscriberId: "flaky_crm_sync",
    domain: "integrations",
    eventNames: ["integration.connected"],
    handler: async (evt) => {
      flakyAttempts++;
      if (!simulateFix) {
        throw new Error("Simulated 503 External CRM Service Unavailable");
      }
    }
  });

  // Publish integration.connected event with maxRetries = 2
  const failingEvt = PlatformEventBus.publish({
    domain: "integrations",
    eventName: "integration.connected",
    aggregateId: "int_hubspot_88",
    aggregateType: "IntegrationConnection",
    payload: { provider: "hubspot", scopes: ["contacts", "deals"] },
    workspaceId: testOrgId,
    userId: testUserId,
    maxRetries: 2
  });

  // Attempt 1: Fails
  const resAttempt1 = await PlatformEventBus.dispatchPending(10);
  assert(resAttempt1.failed === 1, "Attempt 1 failed and remained in outbox");
  assert(flakyAttempts === 1, "Flaky subscriber attempted once");

  // Attempt 2: Fails and reaches maxRetries -> Moves to Dead-Letter Queue
  const resAttempt2 = await PlatformEventBus.dispatchPending(10);
  assert(resAttempt2.deadLettered === 1, "Attempt 2 exceeded maxRetries and transitioned to DEAD_LETTER");
  assert(flakyAttempts === 2, "Flaky subscriber attempted twice");

  const dlqList = PlatformEventBus.listDeadLetters(testOrgId);
  assert(dlqList.length === 1, `DLQ contains 1 failed event (#${dlqList[0].id})`);
  assert(dlqList[0].lastError.includes("External CRM Service Unavailable"), "DLQ captures error trace");

  // Simulate Bug Fix & Safe Replay
  simulateFix = true;
  const replayResult = await PlatformEventBus.replayDeadLetters({
    workspaceId: testOrgId,
    operatorUserId: "usr_lead_architect"
  });

  assert(replayResult.replayed === 1, "1 DLQ event safely replayed");
  assert(flakyAttempts === 3, "Subscriber re-executed after replay and succeeded");

  const dlqAfterReplay = PlatformEventBus.listDeadLetters(testOrgId);
  assert(dlqAfterReplay.length === 0, "DLQ is now empty after successful replay");

  // TEST SUITE 4: Plugin Registry & Sandboxed Capability Engine
  console.log("\n--- TEST SUITE 4: Plugin Registry & Sandboxed Capability Engine ---");
  PluginRegistry.clear();

  // Register Linear Sync Plugin
  const linearPlugin = PluginRegistry.registerPlugin({
    id: "plugin_linear_bridge",
    name: "Linear Sync Pro",
    version: "2.1.0",
    vendor: "SpecForge Ecosystem",
    description: "Bi-directional sync of approved scope items to Linear issues and cycles.",
    capabilities: ["TASK_EXPORT", "COMMUNICATION_BRIDGE"],
    permissions: ["tasks:read", "tasks:write", "projects:read"],
    dataRequirements: {
      readableEntities: ["Project", "TaskItem", "Milestone"],
      writableEntities: ["TaskItem"],
      restrictedFields: ["clientBillingEmail", "marginRate"]
    },
    uiExtensionPoints: [
      {
        id: "ext_linear_btn",
        slot: "project.detail.actions",
        title: "Export to Linear",
        actionType: "button"
      }
    ],
    webhookSubscriptions: ["task.generated", "proposal.approved"],
    rateLimit: {
      requestsPerMinute: 60,
      burstCapacity: 10
    },
    isActive: true
  });

  assert(linearPlugin.id === "plugin_linear_bridge", "Plugin registered in catalog");
  assert(
    linearPlugin.dataRequirements.restrictedFields.includes("apiKey"),
    "System-restricted field 'apiKey' automatically enforced in plugin manifest"
  );

  // Install Plugin in Workspace
  const installation = await PluginRegistry.installPlugin({
    workspaceId: testOrgId,
    pluginId: "plugin_linear_bridge",
    userId: testUserId
  });
  assert(installation.status === "ACTIVE", "Plugin installed with ACTIVE status");

  // Authorize Allowed Action
  const authAllowed = PluginRegistry.authorizePluginAction({
    workspaceId: testOrgId,
    pluginId: "plugin_linear_bridge",
    requiredPermission: "tasks:write",
    targetEntity: "TaskItem",
    actionType: "WRITE"
  });
  assert(authAllowed.allowed === true, "Allowed action authorized for plugin");

  // Deny Unauthorized Permission Check
  let permissionBlocked = false;
  try {
    PluginRegistry.authorizePluginAction({
      workspaceId: testOrgId,
      pluginId: "plugin_linear_bridge",
      requiredPermission: "proposals:write", // NOT granted in manifest
      actionType: "WRITE"
    });
  } catch (err) {
    if (err instanceof PluginSecurityViolationError) {
      permissionBlocked = true;
    }
  }
  assert(permissionBlocked, "Plugin blocked when attempting ungranted permission (proposals:write)");

  // Deny Unauthorized Entity Access Check
  let entityBlocked = false;
  try {
    PluginRegistry.authorizePluginAction({
      workspaceId: testOrgId,
      pluginId: "plugin_linear_bridge",
      requiredPermission: "projects:read",
      targetEntity: "InvoiceRecord", // NOT in readableEntities
      actionType: "READ"
    });
  } catch (err) {
    if (err instanceof PluginSecurityViolationError) {
      entityBlocked = true;
    }
  }
  assert(entityBlocked, "Plugin blocked when attempting to read unauthorized entity (InvoiceRecord)");

  // Field Masking Verification
  const sensitiveRawData = {
    id: "task_100",
    title: "Implement SSO Flow",
    estimatedHours: 16,
    marginRate: 0.35, // Restricted
    clientBillingEmail: "finance@clientcorp.com", // Restricted
    apiKey: "sk_live_secret_token" // System Restricted
  };

  const sanitized = PluginRegistry.maskRestrictedFields("plugin_linear_bridge", sensitiveRawData);
  assert(sanitized.id === "task_100", "Sanitized object retains authorized 'id'");
  assert(sanitized.title === "Implement SSO Flow", "Sanitized object retains authorized 'title'");
  assert(sanitized.marginRate === undefined, "Sanitized object stripped 'marginRate'");
  assert(sanitized.clientBillingEmail === undefined, "Sanitized object stripped 'clientBillingEmail'");
  assert(sanitized.apiKey === undefined, "Sanitized object stripped 'apiKey'");

  // UI Extension Points Retrieval
  const actionExtensions = PluginRegistry.getActiveUIExtensionPoints(testOrgId, "project.detail.actions");
  assert(actionExtensions.length === 1, "Found 1 UI extension point for slot 'project.detail.actions'");
  assert(actionExtensions[0].extension.title === "Export to Linear", "UI extension matches registered button");

  // TEST SUITE 5: Feature Flag Governance & Instant Kill Switch
  console.log("\n--- TEST SUITE 5: Feature Flag Governance & Kill-Switch Audit ---");
  FeatureFlagsEngine.clear();

  // Test Tier Gating
  const tierEvalFree = FeatureFlagsEngine.evaluate("modular_plugin_extensibility", {
    organizationId: "org_free_user",
    subscriptionTier: "FREE"
  });
  assert(tierEvalFree.isEnabled === false, "Modular plugins disabled for FREE tier");

  const tierEvalAgency = FeatureFlagsEngine.evaluate("modular_plugin_extensibility", {
    organizationId: "org_agency_user",
    subscriptionTier: "AGENCY"
  });
  assert(tierEvalAgency.isEnabled === true, "Modular plugins enabled for AGENCY tier");

  // Test Workspace-Level Specific Override
  FeatureFlagsEngine.setWorkspaceOverride(
    "modular_plugin_extensibility",
    "org_special_pilot_workspace",
    true,
    "usr_pm_lead",
    "Special pilot access granted"
  );

  const overrideEval = FeatureFlagsEngine.evaluate("modular_plugin_extensibility", {
    organizationId: "org_special_pilot_workspace",
    subscriptionTier: "FREE" // FREE tier, but overridden
  });
  assert(overrideEval.isEnabled === true, "Workspace-level override bypasses subscription tier constraint");

  // Test Regional Targeting Check
  const usEastEval = FeatureFlagsEngine.evaluate("ai_claude_37_sonnet", {
    organizationId: testOrgId,
    subscriptionTier: "ENTERPRISE",
    region: "us-east-1"
  });
  assert(usEastEval.isEnabled === true, "Claude 3.7 enabled in us-east-1");

  const apSouthEval = FeatureFlagsEngine.evaluate("ai_claude_37_sonnet", {
    organizationId: testOrgId,
    subscriptionTier: "ENTERPRISE",
    region: "ap-south-1" // Not in targetRegions ['us-east-1', 'eu-central-1']
  });
  assert(apSouthEval.isEnabled === false, "Claude 3.7 disabled in non-targeted region (ap-south-1)");

  // Test Emergency Kill Switch
  const killedFlag = FeatureFlagsEngine.killSwitch(
    "ai_claude_37_sonnet",
    "Security advisory CVE-2026-9901 upstream anomaly",
    "usr_sre_lead"
  );
  assert(killedFlag.isEnabled === false, "Kill switch immediately disabled flag");
  assert(killedFlag.rolloutPercentage === 0, "Kill switch set rollout percentage to 0");

  const killedEval = FeatureFlagsEngine.evaluate("ai_claude_37_sonnet", {
    organizationId: testOrgId,
    subscriptionTier: "ENTERPRISE",
    region: "us-east-1"
  });
  assert(killedEval.isEnabled === false, "Post-kill switch evaluation returns false for all tenants");

  // Audit Trail Verification
  const auditTrail = FeatureFlagsEngine.getAuditTrail("ai_claude_37_sonnet");
  assert(auditTrail.length > 0, "Audit trail recorded kill switch event");
  assert(auditTrail[0].action === "KILL_SWITCH", "Audit trail correctly notes action 'KILL_SWITCH'");
  assert(auditTrail[0].operatorUserId === "usr_sre_lead", "Audit trail logs operator ID");
  assert(auditTrail[0].reason.includes("Security advisory"), "Audit trail captures reason");

  console.log("\n=======================================================");
  console.log(`   PHASE 5.1 VERIFICATION SUMMARY: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log("   MODULAR PLATFORM ARCHITECTURE IS PRODUCTION-READY!   ");
  console.log("=======================================================\n");
}

runTests().catch((err) => {
  console.error("Verification suite failed:", err);
  process.exit(1);
});
