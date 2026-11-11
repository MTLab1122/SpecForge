"use client";

import React, { useState } from "react";

export interface PersonaItem {
  id: string;
  name: string;
  roleTitle: string;
  description: string;
  goals: string[];
  painPoints: string[];
}

export interface UserFlowItem {
  id: string;
  personaName: string;
  title: string;
  description: string;
  steps: { stepNumber: number; action: string; screen: string }[];
  keyScreens: string[];
  edgeCases: string[];
  linkedRequirementTitles: string[];
}

interface UserFlowMapperProps {
  personas: PersonaItem[];
  flows: UserFlowItem[];
  onCreateFlow?: (flow: Partial<UserFlowItem>) => void;
}

export function UserFlowMapper({ personas, flows, onCreateFlow }: UserFlowMapperProps) {
  const [selectedFlow, setSelectedFlow] = useState<UserFlowItem>(flows[0] || null);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-slate-900">User Personas & Journey Flow Mapping</h3>
          <p className="text-xs text-slate-500">
            Trace client user journeys directly to technical screens, edge cases, and scope items
          </p>
        </div>
      </div>

      {/* Personas Bar */}
      <div className="space-y-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Target Personas ({personas.length})
        </span>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {personas.map((persona) => (
            <div
              key={persona.id}
              className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5"
            >
              <div className="flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                  {persona.name.charAt(0)}
                </span>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{persona.name}</h4>
                  <span className="text-[10px] text-slate-400">{persona.roleTitle}</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-600 line-clamp-2">{persona.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* User Flows Split: Flow Selector (Left) & Step Journey Visualizer (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2 border-t border-slate-100">
        {/* Flow Selector List */}
        <div className="lg:col-span-4 space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Defined User Flows ({flows.length})
          </span>
          <div className="space-y-2">
            {flows.map((flow) => (
              <div
                key={flow.id}
                onClick={() => setSelectedFlow(flow)}
                className={`p-3 rounded-xl border cursor-pointer transition ${
                  selectedFlow?.id === flow.id
                    ? "border-blue-600 bg-blue-50/30 shadow-2xs"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                  {flow.personaName}
                </div>
                <h4 className="text-xs font-bold text-slate-900 mt-0.5">{flow.title}</h4>
                <div className="text-[10px] text-slate-400 mt-1">
                  {flow.steps.length} steps • {flow.keyScreens.length} key screens
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Flow Journey Diagram & Edge Cases */}
        {selectedFlow && (
          <div className="lg:col-span-8 p-4 rounded-xl border border-slate-200 bg-slate-50/40 space-y-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                Persona: {selectedFlow.personaName}
              </span>
              <h4 className="text-base font-bold text-slate-900 mt-1">{selectedFlow.title}</h4>
              <p className="text-xs text-slate-600 mt-0.5">{selectedFlow.description}</p>
            </div>

            {/* Step Sequence Horizontal Diagram */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Step-by-Step Screen Sequence
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {selectedFlow.steps.map((step, idx) => (
                  <React.Fragment key={step.stepNumber}>
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1 min-w-[130px]">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                        <span>STEP {step.stepNumber}</span>
                        <span className="text-blue-600">[{step.screen}]</span>
                      </div>
                      <div className="text-xs font-semibold text-slate-800">{step.action}</div>
                    </div>
                    {idx < selectedFlow.steps.length - 1 && (
                      <span className="text-slate-400 font-bold">→</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Key Screens & Edge Cases */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Key Screens Required ({selectedFlow.keyScreens.length})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedFlow.keyScreens.map((screen, i) => (
                    <span key={i} className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      📺 {screen}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
                  Identified Edge Cases ({selectedFlow.edgeCases.length})
                </span>
                <div className="space-y-1">
                  {selectedFlow.edgeCases.map((edge, i) => (
                    <div key={i} className="text-[11px] text-slate-600 flex items-start gap-1.5">
                      <span className="text-amber-500 font-bold">⚠️</span>
                      <span>{edge}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Linked Requirements */}
            {selectedFlow.linkedRequirementTitles.length > 0 && (
              <div className="pt-2 text-[11px] text-slate-500 flex items-center gap-2">
                <span className="font-semibold text-slate-700">Linked to Requirements:</span>
                {selectedFlow.linkedRequirementTitles.map((req, i) => (
                  <span key={i} className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">
                    {req}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

