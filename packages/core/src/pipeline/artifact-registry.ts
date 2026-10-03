import type { ArtifactRecord } from "./types";

export class ArtifactRegistry {
  private readonly records = new Map<string, ArtifactRecord>();

  register<T>(
    input: Omit<ArtifactRecord<T>, "revision" | "createdAt" | "updatedAt">,
  ): ArtifactRecord<T> {
    if (this.records.has(input.id)) {
      throw new Error(`Artifact ${input.id} already exists.`);
    }

    const now = new Date().toISOString();
    const record: ArtifactRecord<T> = {
      ...input,
      revision: 1,
      createdAt: now,
      updatedAt: now,
    };

    this.records.set(record.id, record as ArtifactRecord);
    return record;
  }

  update<T>(
    id: string,
    patch: Partial<Pick<ArtifactRecord<T>, "status" | "data" | "parentIds">>,
  ): ArtifactRecord<T> {
    const current = this.require<T>(id);
    const updated: ArtifactRecord<T> = {
      ...current,
      ...patch,
      revision: current.revision + 1,
      updatedAt: new Date().toISOString(),
    };

    this.records.set(id, updated as ArtifactRecord);
    return updated;
  }

  get<T>(id: string): ArtifactRecord<T> | undefined {
    return this.records.get(id) as ArtifactRecord<T> | undefined;
  }

  require<T>(id: string): ArtifactRecord<T> {
    const record = this.get<T>(id);
    if (!record) throw new Error(`Artifact ${id} not found.`);
    return record;
  }

  list(kind?: string): ArtifactRecord[] {
    const values = [...this.records.values()];
    return kind ? values.filter((record) => record.kind === kind) : values;
  }

  childrenOf(parentId: string): ArtifactRecord[] {
    return this.list().filter((record) => record.parentIds.includes(parentId));
  }
}
