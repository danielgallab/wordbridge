'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';

interface Node {
  id: string;
  label: string;
  connections: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface Edge {
  source: string;
  target: string;
}

interface GraphData {
  nodes: { id: string; label: string; connections: number }[];
  edges: Edge[];
}

export default function WordWebPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [dimensions, setDimensions] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 800,
    height: typeof window !== 'undefined' ? window.innerHeight - 120 : 600, // Account for header/stats
  }));

  // Pan and zoom state
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const targetScale = useRef(1);
  const targetOffset = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const draggedNode = useRef<Node | null>(null);

  // Smooth zoom animation - use refs to avoid infinite loops
  const currentScaleRef = useRef(1);
  const currentOffsetRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    let animationId: number;
    const lerp = (start: number, end: number, t: number) => start + (end - start) * t;
    const lerpSpeed = 0.15;

    function animateZoom() {
      const tScale = targetScale.current;
      const tOffset = targetOffset.current;
      const cScale = currentScaleRef.current;
      const cOffset = currentOffsetRef.current;

      // Check if we're close enough to stop animating
      const scaleDiff = Math.abs(tScale - cScale);
      const offsetDiff = Math.abs(tOffset.x - cOffset.x) + Math.abs(tOffset.y - cOffset.y);

      if (scaleDiff > 0.001 || offsetDiff > 0.5) {
        const newScale = lerp(cScale, tScale, lerpSpeed);
        const newOffset = {
          x: lerp(cOffset.x, tOffset.x, lerpSpeed),
          y: lerp(cOffset.y, tOffset.y, lerpSpeed),
        };
        currentScaleRef.current = newScale;
        currentOffsetRef.current = newOffset;
        setScale(newScale);
        setOffset(newOffset);
      }

      animationId = requestAnimationFrame(animateZoom);
    }

    animateZoom();
    return () => cancelAnimationFrame(animationId);
  }, []);

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/word-web');
        if (!res.ok) throw new Error('Failed to fetch data');
        const data: GraphData = await res.json();

        if (data.nodes.length === 0) {
          setError('No word connections found yet. Play some games to build the web!');
          setLoading(false);
          return;
        }

        // Initialize node positions randomly spread across a larger area
        // This helps the simulation start with components already somewhat separated
        const container = containerRef.current;
        const w = container?.clientWidth || 800;
        const h = container?.clientHeight || 600;
        const spread = 1.5; // Spread beyond viewport
        const initializedNodes: Node[] = data.nodes.map((n) => ({
          ...n,
          x: (Math.random() - 0.5) * w * spread + w / 2,
          y: (Math.random() - 0.5) * h * spread + h / 2,
          vx: 0,
          vy: 0,
        }));

        setNodes(initializedNodes);
        setEdges(data.edges);
        setLoading(false);
      } catch {
        setError('Failed to load word web data');
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Handle resize - also observes container for initial size
  useEffect(() => {
    function handleResize() {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        if (clientWidth > 0 && clientHeight > 0) {
          setDimensions({
            width: clientWidth,
            height: clientHeight,
          });
        }
      }
    }
    handleResize();
    window.addEventListener('resize', handleResize);

    // Use ResizeObserver to catch when container first becomes visible
    const observer = new ResizeObserver(handleResize);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
    };
  }, []);

  // Find connected components using Union-Find
  const findConnectedComponents = useCallback((nodeList: Node[], edgeList: Edge[]) => {
    const parent = new Map<string, string>();
    const rank = new Map<string, number>();

    // Initialize each node as its own parent
    for (const node of nodeList) {
      parent.set(node.id, node.id);
      rank.set(node.id, 0);
    }

    // Find with path compression
    function find(x: string): string {
      if (parent.get(x) !== x) {
        parent.set(x, find(parent.get(x)!));
      }
      return parent.get(x)!;
    }

    // Union by rank
    function union(x: string, y: string) {
      const rootX = find(x);
      const rootY = find(y);
      if (rootX === rootY) return;

      const rankX = rank.get(rootX)!;
      const rankY = rank.get(rootY)!;
      if (rankX < rankY) {
        parent.set(rootX, rootY);
      } else if (rankX > rankY) {
        parent.set(rootY, rootX);
      } else {
        parent.set(rootY, rootX);
        rank.set(rootX, rankX + 1);
      }
    }

    // Union all connected edges
    for (const edge of edgeList) {
      if (parent.has(edge.source) && parent.has(edge.target)) {
        union(edge.source, edge.target);
      }
    }

    // Group nodes by their root component
    const components = new Map<string, string[]>();
    for (const node of nodeList) {
      const root = find(node.id);
      if (!components.has(root)) {
        components.set(root, []);
      }
      components.get(root)!.push(node.id);
    }

    // Create a map of nodeId -> componentId (index)
    const nodeToComponent = new Map<string, number>();
    let componentIndex = 0;
    for (const nodeIds of components.values()) {
      for (const nodeId of nodeIds) {
        nodeToComponent.set(nodeId, componentIndex);
      }
      componentIndex++;
    }

    return { nodeToComponent, componentCount: components.size };
  }, []);

  // Force simulation
  useEffect(() => {
    if (nodes.length === 0) return;

    let animationId: number;
    // Use a ref to track current nodes to avoid stale closure
    const nodesRef = { current: nodes };

    // Find connected components once
    const { nodeToComponent, componentCount } = findConnectedComponents(nodes, edges);

    // Calculate component centers for layout - arrange in a grid with generous spacing
    // Use a larger virtual canvas so components can spread beyond the viewport
    const spreadFactor = Math.max(2, Math.sqrt(componentCount)); // More components = more spread
    const virtualWidth = dimensions.width * spreadFactor;
    const virtualHeight = dimensions.height * spreadFactor;
    const virtualOffsetX = (virtualWidth - dimensions.width) / 2;
    const virtualOffsetY = (virtualHeight - dimensions.height) / 2;

    const getComponentTargetCenter = (componentId: number) => {
      if (componentCount === 1) {
        return { x: dimensions.width / 2, y: dimensions.height / 2 };
      }

      // Arrange components in a grid pattern across the larger virtual canvas
      const cols = Math.ceil(Math.sqrt(componentCount));
      const rows = Math.ceil(componentCount / cols);
      const col = componentId % cols;
      const row = Math.floor(componentId / cols);

      const cellWidth = virtualWidth / cols;
      const cellHeight = virtualHeight / rows;

      return {
        x: cellWidth * (col + 0.5) - virtualOffsetX,
        y: cellHeight * (row + 0.5) - virtualOffsetY,
      };
    };

    function simulate() {
      const currentNodes = nodesRef.current;
      const updatedNodes = currentNodes.map(n => ({ ...n })); // Deep copy
      const nodeMap = new Map(updatedNodes.map((n) => [n.id, n]));

      const dampening = 0.85;
      const repulsion = 2500; // Increased for more spacing within components
      const attraction = 0.008; // Slightly reduced to allow more spread
      const centerForce = 0.002; // Reduced to allow more natural spreading
      const interComponentRepulsion = 8000; // Strong repulsion between different components
      const minDistance = 60; // Increased minimum distance
      const maxVelocity = 10; // Cap velocity to prevent flying nodes

      // Apply forces
      for (let i = 0; i < updatedNodes.length; i++) {
        const node = updatedNodes[i];
        const nodeComponent = nodeToComponent.get(node.id) ?? 0;

        // Skip if being dragged
        if (draggedNode.current?.id === node.id) continue;

        let fx = 0;
        let fy = 0;

        // Repulsion from other nodes
        for (let j = 0; j < updatedNodes.length; j++) {
          if (i === j) continue;
          const other = updatedNodes[j];
          const otherComponent = nodeToComponent.get(other.id) ?? 0;
          const dx = node.x - other.x;
          const dy = node.y - other.y;
          const distSq = dx * dx + dy * dy;
          const dist = Math.sqrt(distSq) || 1;
          // Use minimum distance to prevent extreme repulsion
          const effectiveDist = Math.max(dist, minDistance);

          // Apply stronger repulsion between nodes in different components
          const repulsionStrength = nodeComponent !== otherComponent
            ? interComponentRepulsion
            : repulsion;
          const force = repulsionStrength / (effectiveDist * effectiveDist);
          fx += (dx / dist) * force;
          fy += (dy / dist) * force;
        }

        // Attraction along edges (use nodeMap for current positions)
        for (const edge of edges) {
          let other: Node | undefined;
          if (edge.source === node.id) {
            other = nodeMap.get(edge.target);
          } else if (edge.target === node.id) {
            other = nodeMap.get(edge.source);
          }
          if (other) {
            const dx = other.x - node.x;
            const dy = other.y - node.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            // Only apply attraction if nodes are far apart enough
            if (dist > minDistance) {
              fx += dx * attraction;
              fy += dy * attraction;
            }
          }
        }

        // Component-aware center gravity - each component has its own target center
        const targetCenter = getComponentTargetCenter(nodeComponent);
        fx += (targetCenter.x - node.x) * centerForce;
        fy += (targetCenter.y - node.y) * centerForce;

        // Update velocity with dampening
        node.vx = (node.vx + fx) * dampening;
        node.vy = (node.vy + fy) * dampening;

        // Clamp velocity to prevent extreme movement
        const velocity = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
        if (velocity > maxVelocity) {
          node.vx = (node.vx / velocity) * maxVelocity;
          node.vy = (node.vy / velocity) * maxVelocity;
        }

        // Update position
        node.x += node.vx;
        node.y += node.vy;

        // No boundary constraints - let nodes spread freely off-screen
        // Users can pan and zoom to explore the full web
      }

      nodesRef.current = updatedNodes;
      setNodes(updatedNodes);
      animationId = requestAnimationFrame(simulate);
    }

    simulate();
    return () => cancelAnimationFrame(animationId);
  }, [nodes.length, edges, dimensions, findConnectedComponents]);

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    // Clear canvas
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--background').trim() || '#121213';
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);

    // Apply transform
    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);

    // Draw edges
    ctx.strokeStyle = 'rgba(128, 128, 128, 0.3)';
    ctx.lineWidth = 1;
    for (const edge of edges) {
      const source = nodeMap.get(edge.source);
      const target = nodeMap.get(edge.target);
      if (source && target) {
        // Highlight edges connected to selected/hovered node
        if (selectedNode && (edge.source === selectedNode.id || edge.target === selectedNode.id)) {
          ctx.strokeStyle = 'rgba(83, 141, 78, 0.8)';
          ctx.lineWidth = 2;
        } else if (hoveredNode && (edge.source === hoveredNode.id || edge.target === hoveredNode.id)) {
          ctx.strokeStyle = 'rgba(181, 159, 59, 0.6)';
          ctx.lineWidth = 1.5;
        } else {
          ctx.strokeStyle = 'rgba(128, 128, 128, 0.3)';
          ctx.lineWidth = 1;
        }
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
        ctx.stroke();
      }
    }

    // Draw nodes
    for (const node of nodes) {
      const radius = Math.min(8 + node.connections * 2, 25);
      const isSelected = selectedNode?.id === node.id;
      const isHovered = hoveredNode?.id === node.id;
      const isConnectedToSelected = selectedNode && edges.some(
        (e) => (e.source === selectedNode.id && e.target === node.id) ||
               (e.target === selectedNode.id && e.source === node.id)
      );

      // Node fill
      if (isSelected) {
        ctx.fillStyle = '#538d4e';
      } else if (isHovered) {
        ctx.fillStyle = '#b59f3b';
      } else if (isConnectedToSelected) {
        ctx.fillStyle = '#538d4e80';
      } else {
        ctx.fillStyle = '#3a3a3c';
      }

      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      ctx.fill();

      // Node border
      ctx.strokeStyle = isSelected || isHovered ? '#ffffff' : '#565758';
      ctx.lineWidth = isSelected || isHovered ? 2 : 1;
      ctx.stroke();

      // Node label
      ctx.fillStyle = '#ffffff';
      ctx.font = `${Math.max(10, 12 - Math.floor(node.label.length / 3))}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Only show label if zoomed in enough or node is highlighted
      if (scale > 0.7 || isSelected || isHovered || isConnectedToSelected) {
        ctx.fillText(node.label.toUpperCase(), node.x, node.y + radius + 12);
      }
    }

    ctx.restore();
  }, [nodes, edges, hoveredNode, selectedNode, dimensions, scale, offset]);

  // Get node at position
  const getNodeAtPosition = useCallback((clientX: number, clientY: number): Node | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left - offset.x) / scale;
    const y = (clientY - rect.top - offset.y) / scale;

    for (const node of nodes) {
      const radius = Math.min(8 + node.connections * 2, 25);
      const dx = x - node.x;
      const dy = y - node.y;
      if (dx * dx + dy * dy < radius * radius) {
        return node;
      }
    }
    return null;
  }, [nodes, scale, offset]);

  // Mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const node = getNodeAtPosition(e.clientX, e.clientY);
    if (node) {
      draggedNode.current = node;
    } else {
      isDragging.current = true;
      dragStart.current = { x: e.clientX - targetOffset.current.x, y: e.clientY - targetOffset.current.y };
    }
  }, [getNodeAtPosition]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (draggedNode.current) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left - offset.x) / scale;
      const y = (e.clientY - rect.top - offset.y) / scale;

      setNodes((prev) => prev.map((n) =>
        n.id === draggedNode.current?.id
          ? { ...n, x, y, vx: 0, vy: 0 }
          : n
      ));
    } else if (isDragging.current) {
      const newOffset = {
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y,
      };
      targetOffset.current = newOffset;
      currentOffsetRef.current = newOffset; // Keep in sync for responsive panning
      setOffset(newOffset);
    } else {
      const node = getNodeAtPosition(e.clientX, e.clientY);
      setHoveredNode(node);
    }
  }, [getNodeAtPosition, offset, scale]);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    draggedNode.current = null;
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    const node = getNodeAtPosition(e.clientX, e.clientY);
    if (node) {
      setSelectedNode((prev) => (prev?.id === node.id ? null : node));
    } else {
      setSelectedNode(null);
    }
  }, [getNodeAtPosition]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Smoother zoom factor
    const zoomFactor = e.deltaY > 0 ? 0.92 : 1.08;
    const currentScale = targetScale.current;
    const newScale = Math.min(3, Math.max(0.3, currentScale * zoomFactor));

    // Calculate offset adjustment to zoom toward mouse position
    // The point under the mouse should stay fixed
    const currentOffset = targetOffset.current;
    const newOffset = {
      x: mouseX - (mouseX - currentOffset.x) * (newScale / currentScale),
      y: mouseY - (mouseY - currentOffset.y) * (newScale / currentScale),
    };

    targetScale.current = newScale;
    targetOffset.current = newOffset;
  }, []);

  // Get connected words for selected node
  const connectedWords = selectedNode
    ? edges
        .filter((e) => e.source === selectedNode.id || e.target === selectedNode.id)
        .map((e) => (e.source === selectedNode.id ? e.target : e.source))
    : [];

  if (loading) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="text-lg">Loading word web...</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <p className="text-lg text-[var(--text-muted)] mb-4">{error}</p>
          <Link
            href="/"
            className="inline-block px-6 py-3 rounded-md bg-[var(--correct)] text-white font-bold hover:opacity-90 transition-opacity"
          >
            Play Now
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-[var(--border)]">
        <Link href="/" className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </Link>
        <h1 className="text-xl font-bold">Word Web</h1>
        <div className="w-5" />
      </header>

      {/* Stats bar */}
      <div className="flex items-center justify-center gap-6 py-2 px-4 bg-[var(--surface)] border-b border-[var(--border)] text-sm">
        <span className="text-[var(--text-muted)]">
          <span className="font-bold text-[var(--text)]">{nodes.length}</span> words
        </span>
        <span className="text-[var(--text-muted)]">
          <span className="font-bold text-[var(--text)]">{edges.length}</span> connections
        </span>
        <span className="text-[var(--text-muted)]">
          Zoom: <span className="font-bold text-[var(--text)]">{Math.round(scale * 100)}%</span>
        </span>
      </div>

      {/* Canvas container */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden">
        <canvas
          ref={canvasRef}
          width={dimensions.width}
          height={dimensions.height}
          className="cursor-grab active:cursor-grabbing absolute inset-0 w-full h-full"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={handleClick}
          onWheel={handleWheel}
        />

        {/* Selected node info panel */}
        {selectedNode && (
          <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-72 bg-[var(--surface)] border-2 border-[var(--border)] rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-lg uppercase">{selectedNode.label}</h3>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-[var(--text-muted)] hover:text-[var(--text)]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <p className="text-sm text-[var(--text-muted)] mb-3">
              {selectedNode.connections} connection{selectedNode.connections !== 1 ? 's' : ''}
            </p>
            <div className="flex flex-wrap gap-1">
              {connectedWords.map((word) => (
                <span
                  key={word}
                  className="px-2 py-1 text-xs rounded bg-[var(--background)] border border-[var(--border)] uppercase"
                >
                  {word}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Hover tooltip */}
        {hoveredNode && !selectedNode && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[var(--surface)] border border-[var(--border)] rounded px-3 py-1 text-sm pointer-events-none">
            <span className="font-bold uppercase">{hoveredNode.label}</span>
            <span className="text-[var(--text-muted)] ml-2">
              {hoveredNode.connections} connection{hoveredNode.connections !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Instructions */}
        <div className="absolute bottom-4 left-4 text-xs text-[var(--text-muted)] hidden sm:block">
          Scroll to zoom • Drag to pan • Click nodes for details
        </div>
      </div>
    </main>
  );
}
