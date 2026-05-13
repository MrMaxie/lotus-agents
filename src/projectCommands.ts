import { z } from 'zod';
import { enumValues } from './enumValues';

export enum ProjectCommand {
  Install = 'install',
  Update = 'update',
  Remove = 'remove',
  Doctor = 'doctor',
  Validate = 'validate',
}

export enum DocsMode {
  Committed = 'committed',
  LocalOnly = 'local-only',
}

export const projectCommandSchema = z.enum(enumValues(ProjectCommand));
export const docsModeSchema = z.enum(enumValues(DocsMode));
