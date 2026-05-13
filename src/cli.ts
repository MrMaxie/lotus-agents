#!/usr/bin/env node
import { runCli } from './program';

const result = await runCli();
process.exitCode = result.exitCode;
