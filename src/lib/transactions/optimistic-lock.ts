import { ConflictError } from "../reliability/error-envelope.ts";

export interface VersionedEntity {
  id: string;
  version: number;
  [key: string]: any;
}

export class OptimisticLockService {
  /**
   * Asserts optimistic locking version match.
   * Throws 409 ConflictError if version has drifted.
   */
  public static verifyAndIncrement<T extends VersionedEntity>(
    entityName: string,
    currentEntity: T,
    expectedVersion: number
  ): { nextVersion: number } {
    if (currentEntity.version !== expectedVersion) {
      throw new ConflictError(
        `Optimistic Lock Conflict: ${entityName} with id '${currentEntity.id}' has been modified by another concurrent user. (Current: v${currentEntity.version}, Provided: v${expectedVersion}). Please reload the latest version.`
      );
    }

    return {
      nextVersion: currentEntity.version + 1
    };
  }

  /**
   * Wraps an in-memory or database record mutation with optimistic concurrency check.
   */
  public static executeWithLock<T extends VersionedEntity>(params: {
    entityName: string;
    currentEntity: T;
    expectedVersion: number;
    mutation: (nextVersion: number) => T;
  }): T {
    const { nextVersion } = this.verifyAndIncrement(
      params.entityName,
      params.currentEntity,
      params.expectedVersion
    );

    const updated = params.mutation(nextVersion);
    updated.version = nextVersion;
    return updated;
  }
}
