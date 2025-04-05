import { Tool } from '@shared/schema';
import { ITool } from './toolManager';
import fs from 'fs/promises';
import path from 'path';

export class FileSystem implements ITool {
  private toolData: Tool;
  private basePath: string;
  private allowedExtensions: string[];
  
  constructor(toolData: Tool) {
    this.toolData = toolData;
    
    const config = toolData.config as Record<string, any> || {};
    this.basePath = config.basePath || './workspace';
    this.allowedExtensions = config.allowedExtensions || ['.txt', '.md', '.json', '.csv'];
    
    // Ensure base path exists
    this.initializeBasePath().catch(console.error);
  }
  
  private async initializeBasePath(): Promise<void> {
    try {
      await fs.mkdir(this.basePath, { recursive: true });
    } catch (error) {
      console.error('Error creating base path:', error);
    }
  }
  
  getName(): string {
    return this.toolData.name;
  }
  
  getType(): string {
    return this.toolData.type;
  }
  
  getDescription(): string {
    return this.toolData.description || 'Read and write files in the workspace';
  }
  
  isEnabled(): boolean {
    return this.toolData.isEnabled;
  }
  
  getParameters(): Record<string, any> {
    return {
      type: 'object',
      required: ['action'],
      properties: {
        action: {
          type: 'string',
          enum: ['read', 'write', 'list', 'delete'],
          description: 'Action to perform: read, write, list, or delete files',
        },
        filename: {
          type: 'string',
          description: 'Filename including extension for read, write, and delete actions',
        },
        content: {
          type: 'string',
          description: 'Content to write when action is "write"',
        },
        directory: {
          type: 'string',
          description: 'Directory path relative to base path for list action',
        }
      }
    };
  }
  
  async execute(params: any): Promise<any> {
    // Validate action
    if (!params.action) {
      throw new Error('Action parameter is required');
    }
    
    switch (params.action) {
      case 'read':
        return this.readFile(params.filename);
      case 'write':
        return this.writeFile(params.filename, params.content);
      case 'list':
        return this.listFiles(params.directory || '');
      case 'delete':
        return this.deleteFile(params.filename);
      default:
        throw new Error(`Unknown action: ${params.action}`);
    }
  }
  
  private validatePath(filePath: string): string {
    // Check if extension is allowed
    const ext = path.extname(filePath).toLowerCase();
    if (!this.allowedExtensions.includes(ext)) {
      throw new Error(`File extension "${ext}" is not allowed. Allowed extensions: ${this.allowedExtensions.join(', ')}`);
    }
    
    // Normalize and join paths
    const normalizedPath = path.normalize(filePath);
    
    // Prevent path traversal attacks by checking if the result stays within base path
    const fullPath = path.join(this.basePath, normalizedPath);
    const relativePath = path.relative(this.basePath, fullPath);
    
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      throw new Error('Path traversal attempt detected. Access denied.');
    }
    
    return fullPath;
  }
  
  private async readFile(filename: string): Promise<any> {
    if (!filename) {
      throw new Error('Filename parameter is required for read action');
    }
    
    try {
      const fullPath = this.validatePath(filename);
      const content = await fs.readFile(fullPath, 'utf-8');
      
      return {
        filename,
        content,
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`File not found: ${filename}`);
      }
      throw error;
    }
  }
  
  private async writeFile(filename: string, content: string): Promise<any> {
    if (!filename) {
      throw new Error('Filename parameter is required for write action');
    }
    
    if (content === undefined || content === null) {
      throw new Error('Content parameter is required for write action');
    }
    
    try {
      const fullPath = this.validatePath(filename);
      
      // Ensure directory exists
      const directory = path.dirname(fullPath);
      await fs.mkdir(directory, { recursive: true });
      
      // Write file
      await fs.writeFile(fullPath, content, 'utf-8');
      
      return {
        filename,
        success: true,
        message: `File "${filename}" written successfully`,
      };
    } catch (error) {
      console.error('Error writing file:', error);
      throw new Error(`Write failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  private async listFiles(directory: string): Promise<any> {
    try {
      // Normalize directory path
      const normalizedDir = path.normalize(directory);
      const fullPath = path.join(this.basePath, normalizedDir);
      
      // Prevent path traversal
      const relativePath = path.relative(this.basePath, fullPath);
      if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
        throw new Error('Path traversal attempt detected. Access denied.');
      }
      
      // Ensure directory exists
      await fs.mkdir(fullPath, { recursive: true });
      
      // List files
      const files = await fs.readdir(fullPath);
      
      // Get details for each file
      const fileDetails = await Promise.all(
        files.map(async (file) => {
          const filePath = path.join(fullPath, file);
          const stats = await fs.stat(filePath);
          
          return {
            name: file,
            type: stats.isDirectory() ? 'directory' : 'file',
            size: stats.size,
            lastModified: stats.mtime.toISOString(),
          };
        })
      );
      
      return {
        directory: directory || '/',
        files: fileDetails,
      };
    } catch (error) {
      console.error('Error listing files:', error);
      throw new Error(`List failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  private async deleteFile(filename: string): Promise<any> {
    if (!filename) {
      throw new Error('Filename parameter is required for delete action');
    }
    
    try {
      const fullPath = this.validatePath(filename);
      
      // Check if file exists
      await fs.access(fullPath);
      
      // Delete file
      await fs.unlink(fullPath);
      
      return {
        filename,
        success: true,
        message: `File "${filename}" deleted successfully`,
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`File not found: ${filename}`);
      }
      console.error('Error deleting file:', error);
      throw new Error(`Delete failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
