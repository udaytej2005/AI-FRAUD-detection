import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { Globe, Network, Shield, AlertTriangle, Radio, Activity, ZoomIn, RefreshCw } from 'lucide-react';
import { SecurityEvent } from '../types';

interface ThreatHeatmapProps {
  events: SecurityEvent[];
}

interface LocationCoord {
  name: string;
  lat: number;
  lon: number;
}

// Map known location names in telemetry to latitude/longitude
const LOCATION_COORDS: Record<string, LocationCoord> = {
  "San Francisco, USA": { name: "San Francisco, USA", lat: 37.7749, lon: -122.4194 },
  "Frankfurt, Germany": { name: "Frankfurt, Germany", lat: 50.1109, lon: 8.6821 },
  "St. Petersburg, Russia": { name: "St. Petersburg, Russia", lat: 59.9343, lon: 30.3351 },
  "Lagos, Nigeria": { name: "Lagos, Nigeria", lat: 6.5244, lon: 3.3792 },
  "Shenzhen, China": { name: "Shenzhen, China", lat: 22.5431, lon: 114.0579 },
  "London, UK": { name: "London, UK", lat: 51.5074, lon: -0.1278 },
  "Sao Paulo, Brazil": { name: "Sao Paulo, Brazil", lat: -23.5505, lon: -46.6333 },
  "Local Region": { name: "Local Region", lat: 39.8283, lon: -98.5795 },
  "Suspicious Node (Tor Exit)": { name: "Suspicious Node (Tor Exit)", lat: 52.3702, lon: 4.8952 }, // Amsterdam approx
  "Default Gateway": { name: "System Gateway", lat: 37.0902, lon: -95.7129 } // Central US
};

export default function ThreatHeatmap({ events }: ThreatHeatmapProps) {
  const [viewMode, setViewMode] = useState<'geographic' | 'topology'>('geographic');
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [simulationSpeed, setSimulationSpeed] = useState<number>(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Keep track of dimension changes
  const [dimensions, setDimensions] = useState({ width: 600, height: 350 });

  useEffect(() => {
    if (!containerRef.current) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width, height } = entries[0].contentRect;
      // Guarantee minimum proportions
      setDimensions({
        width: Math.max(width, 400),
        height: Math.max(height, 350)
      });
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Compute stats on current threats
  const locationStats = useMemo(() => {
    const stats: Record<string, { count: number, maxRisk: number, lastSeen: string, status: string }> = {};
    events.forEach(evt => {
      const loc = evt.details?.location || "Local Region";
      if (!stats[loc]) {
        stats[loc] = { count: 0, maxRisk: 0, lastSeen: "", status: "allowed" };
      }
      stats[loc].count++;
      stats[loc].maxRisk = Math.max(stats[loc].maxRisk, evt.riskScore);
      stats[loc].lastSeen = evt.timestamp;
      if (evt.status === 'blocked') stats[loc].status = 'blocked';
      else if (evt.status === 'flagged' && stats[loc].status !== 'blocked') stats[loc].status = 'flagged';
    });
    return Object.entries(stats).map(([name, data]) => ({ name, ...data }));
  }, [events]);

  // Main D3 Rendering Effect
  useEffect(() => {
    if (!svgRef.current) return;

    // Clear previous elements
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const { width, height } = dimensions;

    // Standard margins
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    if (viewMode === 'geographic') {
      renderGeographicMap(g, chartWidth, chartHeight);
    } else {
      renderNetworkTopology(g, chartWidth, chartHeight);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dimensions, viewMode, events, simulationSpeed]);

  // 1. Renders the Stylized Geographic World Cyber Map
  const renderGeographicMap = (
    g: d3.Selection<SVGGElement, unknown, null, undefined>,
    w: number,
    h: number
  ) => {
    // Mercator Projection configured to fit inside the viewport nicely
    const projection = d3.geoMercator()
      .scale(w / 6.5)
      .translate([w / 2, h / 1.7]);

    // Draw grid background (graticule) for technical appearance
    const graticule = d3.geoGraticule();
    g.append("path")
      .datum(graticule)
      .attr("class", "graticule")
      .attr("d", d3.geoPath().projection(projection) as any)
      .attr("fill", "none")
      .attr("stroke", "#1f2937") // zinc-800 equivalent
      .attr("stroke-width", "0.5")
      .attr("stroke-dasharray", "2,4");

    // Central hub coordinate (representing the target security gateway center)
    const gatewayCoords: [number, number] = [-95.7129, 37.0902]; // US Central
    const [gateX, gateY] = projection(gatewayCoords) || [w / 2, h / 2];

    // Draw stylized continents as decorative abstract background grids/nodes
    // To remain lightweight and offline-compatible, we place continental coordinate points with soft glows
    const continentGroups = [
      { name: "North America", coords: [[-100, 45], [-115, 50], [-90, 35], [-120, 37], [-80, 43], [-105, 30], [-74, 40]] },
      { name: "South America", coords: [[-60, -10], [-50, -20], [-70, -15], [-45, -23], [-70, -35]] },
      { name: "Europe", coords: [[10, 50], [0, 51], [20, 48], [30, 60], [-5, 40], [15, 45], [25, 55]] },
      { name: "Africa", coords: [[15, 10], [25, -15], [3, 6], [35, 0], [20, 25], [10, -5]] },
      { name: "Asia", coords: [[100, 35], [115, 25], [80, 45], [105, 60], [90, 20], [120, 45], [135, 48]] },
      { name: "Oceania", coords: [[135, -25], [145, -30], [140, -20], [175, -40]] }
    ];

    // Render stylized dots representing continents
    continentGroups.forEach(continent => {
      continent.coords.forEach(([lon, lat]) => {
        const pt = projection([lon, lat]);
        if (pt) {
          g.append("circle")
            .attr("cx", pt[0])
            .attr("cy", pt[1])
            .attr("r", 2.5)
            .attr("fill", "#27272a") // zinc-700
            .attr("opacity", 0.4);
        }
      });
    });

    // Draw Onyx Central System Gateway Hub
    const gatewayGroup = g.append("g")
      .attr("class", "gateway-hub");

    // Pulsing outer gateway ring
    gatewayGroup.append("circle")
      .attr("cx", gateX)
      .attr("cy", gateY)
      .attr("r", 15)
      .attr("fill", "none")
      .attr("stroke", "#10b981") // emerald-500
      .attr("stroke-width", "1")
      .attr("opacity", 0.5)
      .append("animate")
      .attr("attributeName", "r")
      .attr("values", "8;22;8")
      .attr("dur", "4s")
      .attr("repeatCount", "indefinite");

    // Inner gateway solid node
    gatewayGroup.append("circle")
      .attr("cx", gateX)
      .attr("cy", gateY)
      .attr("r", 5)
      .attr("fill", "#10b981")
      .attr("stroke", "#18181b")
      .attr("stroke-width", "1.5");

    gatewayGroup.append("text")
      .attr("x", gateX)
      .attr("y", gateY - 14)
      .attr("text-anchor", "middle")
      .attr("fill", "#a1a1aa")
      .attr("font-size", "7px")
      .attr("font-weight", "bold")
      .attr("font-family", "monospace")
      .text("SECURITY_GW_01");

    // Gather live threat telemetry events to draw heatmap clusters and connecting attack vectors
    const activeThreatEvents = events.slice(0, 30); // show recent 30 events

    // Helper map of already plotted endpoints for clustering heat
    const plottedLocations: Record<string, { x: number, y: number, events: SecurityEvent[], totalRisk: number }> = {};

    activeThreatEvents.forEach((evt) => {
      const locName = evt.details?.location || "Local Region";
      const coord = LOCATION_COORDS[locName] || LOCATION_COORDS["Local Region"];
      const projected = projection([coord.lon, coord.lat]);
      
      if (projected) {
        const [x, y] = projected;
        const key = `${Math.round(x/10)*10},${Math.round(y/10)*10}`; // slight aggregation
        if (!plottedLocations[key]) {
          plottedLocations[key] = { x, y, events: [], totalRisk: 0 };
        }
        plottedLocations[key].events.push(evt);
        plottedLocations[key].totalRisk += evt.riskScore;
      }
    });

    // Draw attack vector lines and cluster heatmap rings
    Object.entries(plottedLocations).forEach(([key, loc]) => {
      const count = loc.events.length;
      const avgRisk = loc.totalRisk / count;
      const isAnomalous = avgRisk >= 65;
      const isCritical = avgRisk >= 85;

      const strokeColor = isCritical ? '#f87171' : isAnomalous ? '#fbbf24' : '#60a5fa'; // red-400 / amber-400 / blue-400
      const pulseColor = isCritical ? 'rgba(239, 68, 68, 0.4)' : isAnomalous ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.2)';

      // 1. Draw connecting arc/line to center gateway
      const pathId = `threat-arc-${key.replace(',', '-')}`;
      
      // Calculate curved path (quadratic bezier curve for aesthetic cyber-line look)
      const dx = gateX - loc.x;
      const dy = gateY - loc.y;
      const dr = Math.sqrt(dx * dx + dy * dy);
      
      // Offset center for curves
      const cx = (loc.x + gateX) / 2 - (dy * 0.15);
      const cy = (loc.y + gateY) / 2 + (dx * 0.15);

      const pathString = `M ${loc.x} ${loc.y} Q ${cx} ${cy} ${gateX} ${gateY}`;

      g.append("path")
        .attr("d", pathString)
        .attr("fill", "none")
        .attr("stroke", strokeColor)
        .attr("stroke-width", isAnomalous ? "1.2" : "0.6")
        .attr("opacity", isCritical ? 0.6 : isAnomalous ? 0.4 : 0.15)
        .attr("stroke-dasharray", isCritical ? "none" : "3,3");

      // 2. Pulse indicator packet (particle) moving from source to target representing threat transmission
      const particle = g.append("circle")
        .attr("r", isCritical ? 3 : 2)
        .attr("fill", strokeColor)
        .attr("opacity", 0.9);

      // Create animated keyframe movement along the curved path
      const animateParticle = () => {
        const pathNode = g.append("path")
          .attr("d", pathString)
          .attr("fill", "none")
          .style("display", "none")
          .node();

        if (pathNode) {
          const totalLength = pathNode.getTotalLength();
          particle
            .transition()
            .duration(Math.max(1500, 4000 - avgRisk * 30) / simulationSpeed)
            .ease(d3.easeLinear)
            .attrTween("transform", () => {
              return (t) => {
                const point = pathNode.getPointAtLength(t * totalLength);
                return `translate(${point.x}, ${point.y})`;
              };
            })
            .on("end", () => {
              pathNode.remove();
              animateParticle();
            });
        }
      };

      animateParticle();

      // 3. Draw Threat Origin Pulsing Heat Circle (Heatmap Cluster Node)
      const clusterGroup = g.append("g")
        .attr("class", "threat-cluster")
        .attr("cursor", "pointer")
        .on("click", (e) => {
          e.stopPropagation();
          setSelectedNode({
            type: 'location',
            name: loc.events[0].details?.location || "Remote Region",
            eventsCount: count,
            avgRiskScore: Math.round(avgRisk),
            latestEvent: loc.events[0],
            events: loc.events
          });
        });

      // Ambient glowing outer heatmap bubble
      clusterGroup.append("circle")
        .attr("cx", loc.x)
        .attr("cy", loc.y)
        .attr("r", Math.min(30, 6 + count * 3))
        .attr("fill", pulseColor)
        .attr("opacity", 0.3)
        .append("animate")
        .attr("attributeName", "r")
        .attr("values", `${Math.min(30, 6 + count * 2)};${Math.min(45, 12 + count * 5)};${Math.min(30, 6 + count * 2)}`)
        .attr("dur", `${Math.max(1.5, 4 - count * 0.5)}s`)
        .attr("repeatCount", "indefinite");

      // Solid central marker point
      clusterGroup.append("circle")
        .attr("cx", loc.x)
        .attr("cy", loc.y)
        .attr("r", Math.min(8, 3.5 + count * 0.8))
        .attr("fill", strokeColor)
        .attr("stroke", "#18181b")
        .attr("stroke-width", "1.5")
        .attr("class", "hover:scale-125 transition-transform duration-200");

      // Small dynamic text label showing risk level or volume
      clusterGroup.append("text")
        .attr("x", loc.x)
        .attr("y", loc.y + Math.min(18, 12 + count * 1.5))
        .attr("text-anchor", "middle")
        .attr("fill", "#d4d4d8")
        .attr("font-size", "8px")
        .attr("font-weight", "600")
        .attr("font-family", "monospace")
        .text(`${Math.round(avgRisk)}% Risk (${count}x)`);
    });
  };

  // 2. Renders the Force-Directed Network Topology Map with Active Threat Clusters
  const renderNetworkTopology = (
    g: d3.Selection<SVGGElement, unknown, null, undefined>,
    w: number,
    h: number
  ) => {
    // Generate graph nodes based on the current system servers & anomalous events
    const nodes = [
      { id: "core_firewall", label: "Core Firewall", type: "hub", heat: 10, category: "infrastructure" },
      { id: "api_gateway", label: "V1 API Gateway", type: "router", heat: 20, category: "infrastructure" },
      { id: "auth_server", label: "Cognitive Auth Svc", type: "auth", heat: 15, category: "infrastructure" },
      { id: "db_instance", label: "Onyx Spanner DB", type: "db", heat: 10, category: "infrastructure" },
      { id: "slack_webhook", label: "Slack Notifier", type: "connector", heat: 5, category: "infrastructure" }
    ];

    const links = [
      { source: "core_firewall", target: "api_gateway", value: 1, heat: 10 },
      { source: "core_firewall", target: "auth_server", value: 1, heat: 10 },
      { source: "api_gateway", target: "db_instance", value: 2, heat: 15 },
      { source: "auth_server", target: "db_instance", value: 1, heat: 5 },
      { source: "core_firewall", target: "slack_webhook", value: 1, heat: 5 }
    ];

    // Read the latest 15 events to dynamically plot incoming traffic threat actors connected to the firewall
    const recentEvents = events.slice(0, 15);
    const externalNodesAdded = new Set<string>();

    recentEvents.forEach((evt) => {
      const sourceIp = evt.source || "Unknown IP";
      const isAnomalous = evt.riskScore >= 65;
      
      // Group similar clean traffic sources or create high fidelity anomalous nodes
      const nodeId = `ext_${sourceIp.replace(/[@.]/g, '_')}`;
      if (!externalNodesAdded.has(nodeId)) {
        externalNodesAdded.add(nodeId);
        nodes.push({
          id: nodeId,
          label: sourceIp,
          type: "client",
          heat: evt.riskScore,
          category: evt.status === 'blocked' ? "blocked" : evt.status === 'flagged' ? "flagged" : "allowed"
        });
        
        // Link external traffic to our edge (Core Firewall)
        links.push({
          source: nodeId,
          target: "core_firewall",
          value: 1,
          heat: evt.riskScore
        });
      }

      // Propagate heat to infrastructure nodes depending on request type
      if (evt.type === 'api') {
        const gateway = nodes.find(n => n.id === "api_gateway");
        const db = nodes.find(n => n.id === "db_instance");
        if (gateway) gateway.heat = Math.max(gateway.heat, evt.riskScore * 0.8);
        if (db) db.heat = Math.max(db.heat, evt.riskScore * 0.5);
      } else if (evt.type === 'login') {
        const auth = nodes.find(n => n.id === "auth_server");
        const db = nodes.find(n => n.id === "db_instance");
        if (auth) auth.heat = Math.max(auth.heat, evt.riskScore * 0.9);
        if (db) db.heat = Math.max(db.heat, evt.riskScore * 0.4);
      }
      
      // Global Firewall heat mirrors incoming risk
      const fw = nodes.find(n => n.id === "core_firewall");
      if (fw) fw.heat = Math.max(fw.heat, evt.riskScore * 0.7);
    });

    // Create D3 Force Layout Simulation
    const simulation = d3.forceSimulation(nodes as any)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(w / 6.5))
      .force("charge", d3.forceManyBody().strength(-180))
      .force("center", d3.forceCenter(w / 2, h / 2))
      .force("collision", d3.forceCollide().radius(25));

    // Render connecting links (wires)
    const linkElements = g.append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("stroke", (d: any) => {
        const hVal = d.heat || 10;
        return hVal >= 85 ? '#ef4444' : hVal >= 65 ? '#f59e0b' : '#27272a';
      })
      .attr("stroke-width", (d: any) => d.heat >= 65 ? 2 : 1)
      .attr("stroke-opacity", (d: any) => d.heat >= 65 ? 0.8 : 0.45);

    // Dynamic particles moving along links to represent live packet transmission
    const linkPathSelection = g.append("g")
      .attr("class", "packets")
      .selectAll("circle")
      .data(links)
      .enter()
      .append("circle")
      .attr("r", (d: any) => d.heat >= 65 ? 3 : 2)
      .attr("fill", (d: any) => {
        const hVal = d.heat || 10;
        return hVal >= 85 ? '#f87171' : hVal >= 65 ? '#fbbf24' : '#10b981';
      });

    // Create node group container
    const nodeElements = g.append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(nodes)
      .enter()
      .append("g")
      .attr("cursor", "pointer")
      .on("click", (e, d: any) => {
        e.stopPropagation();
        setSelectedNode({
          type: 'topology-node',
          name: d.label,
          role: d.type.toUpperCase(),
          heatLevel: Math.round(d.heat),
          category: d.category
        });
      });

    // Outer heat glowing ring for elements based on threat score
    nodeElements.append("circle")
      .attr("r", (d: any) => d.type === "hub" ? 22 : d.type === "client" ? 11 : 16)
      .attr("fill", "none")
      .attr("stroke", (d: any) => {
        return d.heat >= 85 ? '#ef4444' : d.heat >= 65 ? '#fbbf24' : '#10b981';
      })
      .attr("stroke-width", "1.5")
      .attr("opacity", (d: any) => d.heat >= 65 ? 0.8 : 0.25)
      .append("animate")
      .attr("attributeName", "r")
      .attr("values", (d: any) => {
        const base = d.type === "hub" ? 20 : d.type === "client" ? 10 : 15;
        return `${base};${base + 6};${base}`;
      })
      .attr("dur", (d: any) => d.heat >= 65 ? "1.5s" : "3s")
      .attr("repeatCount", "indefinite");

    // Main solid node body
    nodeElements.append("circle")
      .attr("r", (d: any) => d.type === "hub" ? 12 : d.type === "client" ? 6 : 9)
      .attr("fill", (d: any) => {
        if (d.type === "hub") return "#18181b";
        if (d.category === "blocked") return "#7f1d1d"; // red-900
        if (d.category === "flagged") return "#78350f"; // amber-900
        if (d.category === "allowed") return "#064e3b"; // emerald-900
        return "#27272a";
      })
      .attr("stroke", (d: any) => {
        if (d.category === "blocked" || d.heat >= 85) return "#f87171";
        if (d.category === "flagged" || d.heat >= 65) return "#fbbf24";
        return "#10b981";
      })
      .attr("stroke-width", "2");

    // Dynamic icons or glyph letters in the nodes
    nodeElements.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "3")
      .attr("fill", "#ffffff")
      .attr("font-size", (d: any) => d.type === "hub" ? "9px" : "7px")
      .attr("font-weight", "bold")
      .attr("font-family", "monospace")
      .text((d: any) => {
        if (d.type === "hub") return "FW";
        if (d.type === "router") return "GW";
        if (d.type === "db") return "DB";
        if (d.type === "auth") return "AU";
        if (d.type === "connector") return "SL";
        return "IP";
      });

    // Dynamic text labeling below node
    nodeElements.append("text")
      .attr("y", (d: any) => d.type === "hub" ? 34 : d.type === "client" ? 20 : 26)
      .attr("text-anchor", "middle")
      .attr("fill", (d: any) => d.heat >= 85 ? '#f87171' : d.heat >= 65 ? '#fbbf24' : '#d4d4d8')
      .attr("font-size", "8px")
      .attr("font-family", "sans-serif")
      .attr("font-weight", (d: any) => d.heat >= 65 ? "bold" : "normal")
      .text((d: any) => `${d.label} (${Math.round(d.heat)}%)`);

    // Update coordinates and move items on tick
    simulation.on("tick", () => {
      linkElements
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      nodeElements
        .attr("transform", (d: any) => `translate(${d.x}, ${d.y})`);

      // Update flying packets along paths on each frame
      const timeFactor = (Date.now() / (1800 / simulationSpeed)) % 1;
      linkPathSelection
        .attr("cx", (d: any) => d.source.x + (d.target.x - d.source.x) * timeFactor)
        .attr("cy", (d: any) => d.source.y + (d.target.y - d.source.y) * timeFactor);
    });

    return () => {
      simulation.stop();
    };
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-lg flex flex-col gap-4" id="threat-heatmap-card">
      
      {/* Header Panel controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/25 rounded-lg text-emerald-400">
            {viewMode === 'geographic' ? <Globe className="w-5 h-5 animate-spin-slow" /> : <Network className="w-5 h-5 animate-pulse" />}
          </div>
          <div>
            <h4 className="font-bold text-zinc-100 text-sm uppercase tracking-wider">
              {viewMode === 'geographic' ? "Geographic Threat Origin Matrix" : "Core System Network Topology"}
            </h4>
            <p className="text-[10px] text-zinc-500 font-medium">Real-time anomalous signal distribution & cluster heatmap</p>
          </div>
        </div>

        {/* Action Toggle buttons */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          
          {/* Speed control */}
          <div className="flex items-center gap-1.5 mr-2 bg-zinc-950 px-2 py-1 rounded-md border border-zinc-850 text-[10px]">
            <span className="text-zinc-500 font-bold uppercase tracking-wider font-mono">Stream:</span>
            <button 
              type="button" 
              onClick={() => setSimulationSpeed(s => s === 1 ? 2 : s === 2 ? 0.5 : 1)}
              className="text-emerald-400 font-bold hover:text-emerald-300 transition-colors px-1"
            >
              {simulationSpeed}x
            </button>
          </div>

          <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-850">
            <button
              type="button"
              onClick={() => { setViewMode('geographic'); setSelectedNode(null); }}
              className={`flex items-center gap-1.5 text-[10px] font-bold px-3 py-1 rounded-md transition-all ${
                viewMode === 'geographic'
                  ? 'bg-emerald-500 text-zinc-950'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              Geo Heatmap
            </button>
            <button
              type="button"
              onClick={() => { setViewMode('topology'); setSelectedNode(null); }}
              className={`flex items-center gap-1.5 text-[10px] font-bold px-3 py-1 rounded-md transition-all ${
                viewMode === 'topology'
                  ? 'bg-emerald-500 text-zinc-950'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              Network Topology
            </button>
          </div>
        </div>
      </div>

      {/* Main visualization container */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        
        {/* SVG Stage */}
        <div 
          ref={containerRef} 
          className="xl:col-span-3 min-h-[350px] relative bg-zinc-950 rounded-xl border border-zinc-850 overflow-hidden flex items-center justify-center shadow-inner"
        >
          {/* Live indicator ticker */}
          <div className="absolute top-3 left-3 bg-zinc-900/85 backdrop-blur-sm border border-zinc-800 rounded-md px-2.5 py-1 flex items-center gap-1.5 text-[9px] font-bold font-mono text-emerald-400 tracking-wider">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
            LIVE RADAR SCAN
          </div>

          {/* SVG Map/Topology Stage */}
          <svg 
            ref={svgRef} 
            width="100%" 
            height={dimensions.height}
            className="w-full h-full text-zinc-100"
          />

          {/* Empty fallback */}
          {events.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-zinc-950/90">
              <Radio className="w-8 h-8 text-zinc-700 animate-pulse mb-2" />
              <p className="text-xs font-semibold text-zinc-400">Awaiting Signal Telemetry...</p>
              <p className="text-[10px] text-zinc-500 max-w-[240px] mt-1">Booting ingestion buffers and resolving geo-ip coordinates.</p>
            </div>
          )}
        </div>

        {/* Side Panel: active node analyzer details */}
        <div className="xl:col-span-1 bg-zinc-950 border border-zinc-850 rounded-xl p-4 flex flex-col justify-between gap-4">
          
          <div className="space-y-3.5">
            <div className="pb-2.5 border-b border-zinc-850">
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-zinc-500">Live Telemetry Stats</span>
              <h5 className="font-bold text-xs text-zinc-200 mt-0.5">Threat Origination Feed</h5>
            </div>

            {selectedNode ? (
              // If a node is actively clicked/inspected
              <div className="space-y-3 animate-fadeIn">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <span className="text-[8px] font-bold uppercase font-mono px-1.5 py-0.5 rounded bg-zinc-900 text-emerald-400 border border-zinc-800">
                      {selectedNode.type === 'location' ? "REGION DETAILS" : "NODE METRICS"}
                    </span>
                    <h6 className="font-extrabold text-xs text-zinc-100 mt-1.5 font-mono truncate max-w-[140px]">{selectedNode.name}</h6>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setSelectedNode(null)} 
                    className="text-[9px] hover:text-zinc-200 text-zinc-500 font-bold uppercase transition-colors"
                  >
                    Clear
                  </button>
                </div>

                <div className="space-y-2 bg-zinc-900/60 p-3 rounded-lg border border-zinc-850 text-[10px]">
                  {selectedNode.type === 'location' ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-zinc-500 font-medium">Recorded Anomalies:</span>
                        <span className="font-bold text-zinc-300 font-mono">{selectedNode.eventsCount}x hits</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500 font-medium">Average Risk Index:</span>
                        <span className={`font-bold font-mono ${selectedNode.avgRiskScore >= 85 ? 'text-red-400' : selectedNode.avgRiskScore >= 65 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {selectedNode.avgRiskScore}%
                        </span>
                      </div>
                      <div className="pt-2 border-t border-zinc-800 mt-1">
                        <span className="text-[8px] font-bold text-zinc-500 block uppercase">Latest Incident Description:</span>
                        <p className="text-[9px] text-zinc-400 mt-0.5 italic leading-relaxed">
                          "{selectedNode.latestEvent?.description}"
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span className="text-zinc-500 font-medium">System Role:</span>
                        <span className="font-bold text-zinc-300 font-mono">{selectedNode.role}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500 font-medium">Core Node Heat:</span>
                        <span className={`font-bold font-mono ${selectedNode.heatLevel >= 85 ? 'text-red-400' : selectedNode.heatLevel >= 65 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {selectedNode.heatLevel}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500 font-medium">Vulnerabilities:</span>
                        <span className={`font-bold ${selectedNode.heatLevel >= 85 ? 'text-red-400' : 'text-emerald-400'}`}>
                          {selectedNode.heatLevel >= 85 ? "HIGH EXPOSURE" : "SECURED / SAFE"}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              // Default view showing rolling geo-region counters
              <div className="space-y-2">
                <span className="text-[8px] font-bold text-zinc-500 block uppercase tracking-wider mb-2">Aggregated Activity Nodes</span>
                <div className="max-h-[170px] overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                  {locationStats.slice(0, 5).map((stat, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-center justify-between p-2 rounded bg-zinc-900/40 border border-zinc-850 hover:bg-zinc-900/80 transition-all text-[10px]"
                    >
                      <span className="font-semibold text-zinc-300 truncate max-w-[110px]">{stat.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-zinc-500">{stat.count}x</span>
                        <span className={`font-mono font-bold px-1 py-0.5 rounded text-[8px] ${
                          stat.status === 'blocked' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 
                          stat.status === 'flagged' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 
                          'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {stat.maxRisk}%
                        </span>
                      </div>
                    </div>
                  ))}
                  {locationStats.length === 0 && (
                    <p className="text-[10px] text-zinc-600 text-center py-6">No signals cached yet.</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Interactive hints */}
          <div className="bg-zinc-900/60 p-3 rounded-lg border border-zinc-850 flex items-start gap-2 text-[9px] text-zinc-400 font-medium leading-relaxed">
            <Radio className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5 animate-pulse" />
            <p>
              {viewMode === 'geographic' 
                ? "Click any pulsed location cluster on the map projection to reveal detailed security alerts and aggregated incident risk factors."
                : "Interactive network simulation nodes are responsive. Click to review signal load, role metrics, and path heats."
              }
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
