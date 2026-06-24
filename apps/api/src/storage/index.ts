import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { FilesystemAdapter } from './filesystem.adapter.js';
import { MongoAdapter } from './mongo/mongo.adapter.js';
import type { StorageAdapter } from './adapter.js';

let _adapter: StorageAdapter | null = null;

export async function getStorage(): Promise<StorageAdapter> {
  if (_adapter) return _adapter;

  if (env.MONGO_URI) {
    await mongoose.connect(env.MONGO_URI);
    _adapter = new MongoAdapter();
    console.log('Storage: MongoDB');
  } else {
    _adapter = new FilesystemAdapter();
    console.log('Storage: Filesystem');
  }

  return _adapter;
}

export type { StorageAdapter };
