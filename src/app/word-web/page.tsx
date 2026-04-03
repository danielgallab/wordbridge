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
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Node[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [dimensions, setDimensions] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 800,
    height: typeof window !== 'undefined' ? window.innerHeight - 120 : 600, // Account for header/stats
  }));

  // Pan and zoom state
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const targetScale = useRef(1);
  const targetOffset = useRef({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });

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

    // Sort components by size (largest first) so biggest webs get centered
    const sortedComponents = Array.from(components.values()).sort((a, b) => b.length - a.length);
    const componentSizes = sortedComponents.map(c => c.length);

    // Create a map of nodeId -> componentId (index, where 0 = largest)
    const nodeToComponent = new Map<string, number>();
    sortedComponents.forEach((nodeIds, componentIndex) => {
      for (const nodeId of nodeIds) {
        nodeToComponent.set(nodeId, componentIndex);
      }
    });

    return { nodeToComponent, componentCount: components.size, componentSizes };
  }, []);

  // Force simulation
  useEffect(() => {
    if (nodes.length === 0) return;

    let animationId: number;
    // Use a ref to track current nodes to avoid stale closure
    const nodesRef = { current: nodes };

    // Find connected components once (sorted by size, largest first)
    const { nodeToComponent, componentCount, componentSizes } = findConnectedComponents(nodes, edges);

    // Calculate component centers - largest in center, others in rings around it
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;

    // Base radius for arranging components - scales with component count but stays reasonable
    const baseRadius = Math.min(dimensions.width, dimensions.height) * 0.4;
    const ringSpacing = Math.min(dimensions.width, dimensions.height) * 0.35;

    const getComponentTargetCenter = (componentId: number) => {
      // Largest component (id 0) goes in the center
      if (componentId === 0 || componentCount === 1) {
        return { x: centerX, y: centerY };
      }

      // Arrange other components in concentric rings around the center
      const remainingCount = componentCount - 1;

      // Determine which ring this component is in and its position
      let ring = 1;
      let positionInRing = componentId - 1;
      let componentsInThisRing = Math.min(6, remainingCount); // First ring has up to 6

      while (positionInRing >= componentsInThisRing && componentsInThisRing > 0) {
        positionInRing -= componentsInThisRing;
        ring++;
        // Each subsequent ring can hold more components
        const usedSoFar = ring === 2 ? Math.min(6, remainingCount) : componentsInThisRing;
        componentsInThisRing = Math.min(6 * ring, remainingCount - usedSoFar);
      }

      // Recalculate how many are actually in this ring for even spacing
      let startOfRing = 0;
      for (let r = 1; r < ring; r++) {
        startOfRing += Math.min(6 * r, remainingCount - startOfRing);
      }
      const actualInThisRing = Math.min(6 * ring, remainingCount - startOfRing);

      const angle = (positionInRing / Math.max(1, actualInThisRing)) * Math.PI * 2 - Math.PI / 2;
      const radius = baseRadius + (ring - 1) * ringSpacing;

      // Scale radius by component size - smaller components can be pushed out more
      const sizeRatio = componentSizes[componentId] / componentSizes[0];
      const adjustedRadius = radius * (1 + (1 - sizeRatio) * 0.3);

      return {
        x: centerX + Math.cos(angle) * adjustedRadius,
        y: centerY + Math.sin(angle) * adjustedRadius,
      };
    };

    // Helper to check if two line segments intersect and get intersection info
    function edgesIntersect(
      x1: number, y1: number, x2: number, y2: number,
      x3: number, y3: number, x4: number, y4: number
    ): { intersects: boolean; t?: number; u?: number } {
      const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
      if (Math.abs(denom) < 0.0001) return { intersects: false };

      const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
      const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

      // Check if intersection is within both segments (not at endpoints)
      if (t > 0.1 && t < 0.9 && u > 0.1 && u < 0.9) {
        return { intersects: true, t, u };
      }
      return { intersects: false };
    }

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
      const crossingRepulsion = 15; // Force to untangle crossing edges

      // Apply forces
      for (let i = 0; i < updatedNodes.length; i++) {
        const node = updatedNodes[i];
        const nodeComponent = nodeToComponent.get(node.id) ?? 0;


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

  // Create node map for rendering
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Get node at position
  const getNodeAtPosition = useCallback((clientX: number, clientY: number): Node | null => {
    const svg = svgRef.current;
    if (!svg) return null;

    const rect = svg.getBoundingClientRect();
    // Use refs to get current offset/scale values
    const currentOffset = currentOffsetRef.current;
    const currentScale = currentScaleRef.current;
    const x = (clientX - rect.left - currentOffset.x) / currentScale;
    const y = (clientY - rect.top - currentOffset.y) / currentScale;

    for (const node of nodes) {
      const radius = Math.min(8 + node.connections * 2, 25);
      const dx = x - node.x;
      const dy = y - node.y;
      if (dx * dx + dy * dy < radius * radius) {
        return node;
      }
    }
    return null;
  }, [nodes]);

  // Mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isPanning.current = true;
    panStart.current = { x: e.clientX - targetOffset.current.x, y: e.clientY - targetOffset.current.y };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning.current) {
      const newOffset = {
        x: e.clientX - panStart.current.x,
        y: e.clientY - panStart.current.y,
      };
      targetOffset.current = newOffset;
      currentOffsetRef.current = newOffset;
      setOffset(newOffset);
    } else {
      const node = getNodeAtPosition(e.clientX, e.clientY);
      setHoveredNode(node);
    }
  }, [getNodeAtPosition]);

  const handleMouseUp = useCallback(() => {
    isPanning.current = false;
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
    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
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

  // Search handler
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }
    const lowerQuery = query.toLowerCase();
    const results = nodes.filter((n) =>
      n.label.toLowerCase().includes(lowerQuery)
    ).slice(0, 8);
    setSearchResults(results);
    setShowSearchDropdown(results.length > 0);
  }, [nodes]);

  // Pan and zoom to a specific node
  const focusOnNode = useCallback((node: Node) => {
    setSelectedNode(node);
    setSearchQuery('');
    setShowSearchDropdown(false);
    searchInputRef.current?.blur();

    // Calculate the offset to center the node on screen
    const targetZoom = 1.5;
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;

    const newOffset = {
      x: centerX - node.x * targetZoom,
      y: centerY - node.y * targetZoom,
    };

    targetScale.current = targetZoom;
    targetOffset.current = newOffset;
  }, [dimensions]);

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
      <header className="flex items-center justify-between p-4 border-b border-[var(--border)] gap-4">
        <Link href="/" className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors flex-shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </Link>
        <h1 className="text-xl font-bold flex-shrink-0">Word Web</h1>
        <div className="relative flex-1 max-w-xs">
          <div className="relative">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
            >
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.3-4.3"/>
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search words..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowSearchDropdown(true)}
              onBlur={() => setTimeout(() => setShowSearchDropdown(false), 150)}
              className="w-full pl-9 pr-3 py-1.5 text-sm rounded-md bg-[var(--surface)] border border-[var(--border)] focus:outline-none focus:border-[var(--text-muted)] placeholder:text-[var(--text-muted)]"
            />
          </div>
          {showSearchDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--surface)] border border-[var(--border)] rounded-md shadow-lg z-50 overflow-hidden">
              {searchResults.map((node) => (
                <button
                  key={node.id}
                  onClick={() => focusOnNode(node)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--background)] flex items-center justify-between"
                >
                  <span className="uppercase font-medium">{node.label}</span>
                  <span className="text-xs text-[var(--text-muted)]">
                    {node.connections} connection{node.connections !== 1 ? 's' : ''}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
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

      {/* SVG container */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden">
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          className="cursor-grab active:cursor-grabbing absolute inset-0 w-full h-full bg-[var(--background)]"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={handleClick}
          onWheel={handleWheel}
        >
          <g transform={`translate(${offset.x}, ${offset.y}) scale(${scale})`}>
            {/* Draw edges */}
            {edges.map((edge) => {
              const source = nodeMap.get(edge.source);
              const target = nodeMap.get(edge.target);
              if (!source || !target) return null;

              const isSelectedEdge = selectedNode && (edge.source === selectedNode.id || edge.target === selectedNode.id);
              const isHoveredEdge = hoveredNode && (edge.source === hoveredNode.id || edge.target === hoveredNode.id);

              let strokeColor = 'rgba(128, 128, 128, 0.3)';
              let strokeWidth = 1;

              if (isSelectedEdge) {
                strokeColor = 'rgba(83, 141, 78, 0.8)';
                strokeWidth = 2;
              } else if (isHoveredEdge) {
                strokeColor = 'rgba(181, 159, 59, 0.6)';
                strokeWidth = 1.5;
              }

              return (
                <line
                  key={`${edge.source}-${edge.target}`}
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth / scale}
                />
              );
            })}

            {/* Draw nodes */}
            {nodes.map((node) => {
              const radius = Math.min(8 + node.connections * 2, 25);
              const isSelected = selectedNode?.id === node.id;
              const isHovered = hoveredNode?.id === node.id;
              const isConnectedToSelected = selectedNode && edges.some(
                (e) => (e.source === selectedNode.id && e.target === node.id) ||
                       (e.target === selectedNode.id && e.source === node.id)
              );

              let fillColor = '#3a3a3c';
              if (isSelected) {
                fillColor = '#538d4e';
              } else if (isHovered) {
                fillColor = '#b59f3b';
              } else if (isConnectedToSelected) {
                fillColor = '#538d4e80';
              }

              const strokeColor = isSelected || isHovered ? '#ffffff' : '#565758';
              const strokeWidth = (isSelected || isHovered ? 2 : 1) / scale;
              const showLabel = scale > 0.7 || isSelected || isHovered || isConnectedToSelected;
              const fontSize = Math.max(10, 12 - Math.floor(node.label.length / 3));

              return (
                <g key={node.id}>
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={radius}
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                  />
                  {showLabel && (
                    <text
                      x={node.x}
                      y={node.y + radius + 12}
                      fill="#ffffff"
                      fontSize={fontSize}
                      fontFamily="system-ui, sans-serif"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                      {node.label.toUpperCase()}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

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
