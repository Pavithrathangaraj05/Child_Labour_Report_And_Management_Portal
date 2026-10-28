import { Schema, model } from 'mongoose';
const counterSchema = new Schema<{ _id: string; seq: number }>({ _id: String, seq: { type: Number, default: 0 } });
export const Counter = model('Counter', counterSchema);

/** Atomic, gap-tolerant sequence generator (used for Case IDs per calendar year). */
export async function nextSequence(key: string): Promise<number> {
  const doc = await Counter.findByIdAndUpdate(key, { $inc: { seq: 1 } }, { new: true, upsert: true });
  return doc!.seq;
}
