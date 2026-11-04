import type {
  PublicationRepository,
  PublicationRecord,
} from '../../src/publication-planner';

export class InMemoryPublicationRepository implements PublicationRepository {
  private items = new Map<string, PublicationRecord>();

  async save(record: PublicationRecord): Promise<void> {
    this.items.set(record.id, { ...record });
  }

  async findById(id: string): Promise<PublicationRecord | undefined> {
    const item = this.items.get(id);
    return item ? { ...item } : undefined;
  }

  get count(): number {
    return this.items.size;
  }
}