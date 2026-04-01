import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

import { getWorkspaceMap } from '@/lib/workspace-utils';

interface SearchResult {
  type: 'memory' | 'activity' | 'task';
  title: string;
  snippet: string;
  path?: string;
  timestamp?: string;
}

function searchInFile(filePath: string, query: string): SearchResult[] {
  const results: SearchResult[] = [];
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const lowerQuery = query.toLowerCase();

    lines.forEach((line, index) => {
      if (line.toLowerCase().includes(lowerQuery)) {
        const start = Math.max(0, index - 1);
        const end = Math.min(lines.length, index + 2);
        const snippet = lines.slice(start, end).join('\n');
        results.push({
          type: 'memory',
          title: path.basename(filePath),
          snippet: snippet.substring(0, 200),
          path: filePath,
        });
      }
    });
  } catch {
    // ignore
  }
  return results;
}

function getMemoryFiles(): string[] {
  const files: string[] = [];
  const workspaceMap = getWorkspaceMap();
  for (const workspacePath of Object.values(workspaceMap)) {
    files.push(path.join(workspacePath, 'MEMORY.md'));
    const memoryDir = path.join(workspacePath, 'memory');
    try {
      files.push(
        ...fs.readdirSync(memoryDir)
          .filter((entry) => entry.endsWith('.md'))
          .map((entry) => path.join(memoryDir, entry)),
      );
    } catch {
      // ignore
    }
  }
  return files;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';

  if (!query || query.length < 2) {
    return NextResponse.json([]);
  }

  const results: SearchResult[] = [];

  for (const file of getMemoryFiles()) {
    results.push(...searchInFile(file, query));
  }

  try {
    const activitiesPath = path.join(process.cwd(), 'data', 'activities.json');
    const activities = JSON.parse(fs.readFileSync(activitiesPath, 'utf-8'));
    const lowerQuery = query.toLowerCase();
    for (const activity of activities) {
      if (
        activity.description?.toLowerCase().includes(lowerQuery) ||
        activity.type?.toLowerCase().includes(lowerQuery)
      ) {
        results.push({
          type: 'activity',
          title: activity.type,
          snippet: activity.description,
          timestamp: activity.timestamp,
        });
      }
    }
  } catch {
    // ignore
  }

  try {
    const tasksPath = path.join(process.cwd(), 'data', 'tasks.json');
    const tasks = JSON.parse(fs.readFileSync(tasksPath, 'utf-8'));
    const lowerQuery = query.toLowerCase();
    for (const task of tasks) {
      if (
        task.name?.toLowerCase().includes(lowerQuery) ||
        task.description?.toLowerCase().includes(lowerQuery)
      ) {
        results.push({
          type: 'task',
          title: task.name,
          snippet: task.description,
          timestamp: task.nextRun,
        });
      }
    }
  } catch {
    // ignore
  }

  return NextResponse.json(results.slice(0, 20));
}
