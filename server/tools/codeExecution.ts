import { Tool } from '@shared/schema';
import { ITool } from './toolManager';
import { exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { promisify } from 'util';

const execPromise = promisify(exec);

export class CodeExecution implements ITool {
  private toolData: Tool;
  private tempDir: string;
  private supportedLanguages: string[];
  private timeout: number;
  
  constructor(toolData: Tool) {
    this.toolData = toolData;
    
    const config = toolData.config as Record<string, any> || {};
    this.tempDir = './tmp_code_execution';
    this.supportedLanguages = config.languages || ['javascript', 'python', 'bash'];
    this.timeout = config.timeout || 10000;
    
    // Create temp directory
    this.initializeTempDir().catch(console.error);
  }
  
  private async initializeTempDir(): Promise<void> {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.error('Error creating temp directory:', error);
    }
  }
  
  getName(): string {
    return this.toolData.name;
  }
  
  getType(): string {
    return this.toolData.type;
  }
  
  getDescription(): string {
    return this.toolData.description || 'Execute code in a secure environment';
  }
  
  isEnabled(): boolean {
    return this.toolData.isEnabled;
  }
  
  getParameters(): Record<string, any> {
    return {
      type: 'object',
      required: ['code', 'language'],
      properties: {
        code: {
          type: 'string',
          description: 'Code to execute',
        },
        language: {
          type: 'string',
          enum: this.supportedLanguages,
          description: `Programming language of the code. Supported languages: ${this.supportedLanguages.join(', ')}`,
        },
        timeout: {
          type: 'number',
          description: `Execution timeout in milliseconds. Default: ${this.timeout}`,
        }
      }
    };
  }
  
  async execute(params: any): Promise<any> {
    if (!params.code) {
      throw new Error('Code parameter is required');
    }
    
    if (!params.language) {
      throw new Error('Language parameter is required');
    }
    
    // Validate language
    if (!this.supportedLanguages.includes(params.language)) {
      throw new Error(`Unsupported language: ${params.language}. Supported languages: ${this.supportedLanguages.join(', ')}`);
    }
    
    const timeout = params.timeout || this.timeout;
    
    return this.executeCode(params.code, params.language, timeout);
  }
  
  private async executeCode(code: string, language: string, timeout: number): Promise<any> {
    // Create unique ID for this execution
    const executionId = uuidv4();
    
    try {
      // Create execution directory
      const executionDir = path.join(this.tempDir, executionId);
      await fs.mkdir(executionDir, { recursive: true });
      
      // Create file with appropriate extension
      let filename: string;
      let command: string;
      
      switch (language) {
        case 'javascript':
          filename = 'script.js';
          command = 'node';
          break;
        case 'python':
          filename = 'script.py';
          command = 'python';
          break;
        case 'bash':
          filename = 'script.sh';
          command = 'bash';
          // Ensure bash script has shebang
          if (!code.trim().startsWith('#!')) {
            code = '#!/bin/bash\n' + code;
          }
          break;
        default:
          throw new Error(`Unsupported language: ${language}`);
      }
      
      const filePath = path.join(executionDir, filename);
      await fs.writeFile(filePath, code);
      
      // For bash scripts, make executable
      if (language === 'bash') {
        await fs.chmod(filePath, 0o755);
      }
      
      // Execute code with timeout
      const { stdout, stderr } = await execPromise(`cd ${executionDir} && ${command} ${filename}`, {
        timeout,
        maxBuffer: 1024 * 1024, // 1MB output limit
      });
      
      return {
        language,
        executionId,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        success: true,
      };
    } catch (error) {
      if (error instanceof Error && 'killed' in error && error.killed) {
        return {
          language,
          executionId,
          error: 'Execution timed out',
          success: false,
        };
      }
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        language,
        executionId,
        error: errorMessage,
        success: false,
      };
    } finally {
      // Clean up
      try {
        const executionDir = path.join(this.tempDir, executionId);
        await fs.rm(executionDir, { recursive: true, force: true });
      } catch (error) {
        console.error('Error cleaning up execution directory:', error);
      }
    }
  }
}
