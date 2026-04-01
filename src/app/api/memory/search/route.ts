import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

import { getWorkspaceMap } from '@/lib/workspace-utils';

interface SearchResult {
  file: string;
  title: string;
  snippet: string;
  matches: number;
  path: string;
}

async function searchFile(filePath: string, query: string, displayPath: string): Promise<SearchResult | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const lower = content.toLowerCase();
    const queryLower = query.toLowerCase();
    const words = queryLower.split(/\s+/).filter(Boolean);

    let totalMatches = 0;
    for (const word of words) {
      let pos = 0;
      while (true) {
        const idx = lower.indexOf(word, pos);
        if (idx === -1) break;
        totalMatches++;
        pos = idx + 1;
      }
    }

    if (totalMatches === 0) return null;

    const firstMatchIdx = lower.indexOf(words[0]);
    const snippetStart = Math.max(0, firstMatchIdx - 60);
    const snippetEnd = Math.min(content.length, firstMatchIdx + 200);
    let snippet = content.slice(snippetStart, snippetEnd).replace(/\n+/g, ' ').trim();
    if (snippetStart > 0) snippet = '...' + snippet;
    if (snippetEnd < content.length) snippet = snippet + '...';

    const titleMatch = content.match(/^#\s+(.+)/m);
    const title = titleMatch ? titleMatch[1] : path.basename(filePath, '.md');

    return { file: path.basename(filePath), title, snippet, matches: totalMatches, path: displayPath };
  } catch {
    return null;
  }
}

async function getFiles(): Promise<Array<{ path: string; display: string }>> {
  const files: Array<{ path: string; display: string }> = [];
  const workspaceMap = getWorkspaceMap();

  for (const [workspaceId, workspacePath] of Object.entries(workspaceMap)) {
    const rootFiles = ['MEMORY.md', 'SOUL.md', 'USER.md', 'AGENTS.md', 'TOOLS.md', 'IDENTITY.md', 'HEARTBEAT.md'];
    for (const entry of rootFiles) {
      const full = path.join(workspacePath, entry);
      try {
        await fs.access(full);
        files.push({ path: full, display: `${workspaceId}/${entry}` });
      } catch {
        // ignore
      }
    }

    try {
      const memDir = path.join(workspacePath, 'memory');
      const memFiles = await fs.readdir(memDir);
      for (const entry of memFiles.sort().reverse().slice(0, 30)) {
        if (entry.endsWith('.md')) {
          files.push({ path: path.join(memDir, entry), display: `${workspaceId}/memory/${entry}` });
        }
      }
    } catch {
      // ignore
    }
  }

  return files;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim() || '';

  if (query.length < 2) {
    return NextResponse.json({ results: [], query });
  }

  try {
    const files = await getFiles();
    const results = await Promise.all(files.map((file) => searchFile(file.path, query, file.display)));
    const sorted = results
      .filter(Boolean)
      .sort((a, b) => (b?.matches || 0) - (a?.matches || 0)) as SearchResult[];

    return NextResponse.json({ results: sorted.slice(0, 20), query, total: sorted.length });
  } catch (error) {
    console.error('[memory/search] Error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
