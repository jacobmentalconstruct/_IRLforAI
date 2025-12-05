import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Room } from '../types';

interface MapVisualizerProps {
  rooms: Room[];
  currentRoomId: string;
}

export const MapVisualizer: React.FC<MapVisualizerProps> = ({ rooms, currentRoomId }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || rooms.length === 0) return;

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous

    const g = svg.append("g");

    // Create links roughly based on coordinates if we had full graph structure, 
    // but here we just render nodes based on their grid coordinates.
    // We need to scale the coordinates to fit the view.
    
    const xExtent = d3.extent(rooms, r => r.coordinates.x) as [number, number];
    const yExtent = d3.extent(rooms, r => r.coordinates.y) as [number, number];
    
    // Add padding
    const xMin = (xExtent[0] || 0) - 1;
    const xMax = (xExtent[1] || 0) + 1;
    const yMin = (yExtent[0] || 0) - 1;
    const yMax = (yExtent[1] || 0) + 1;

    const xScale = d3.scaleLinear().domain([xMin, xMax]).range([50, width - 50]);
    const yScale = d3.scaleLinear().domain([yMin, yMax]).range([height - 50, 50]); // Y flip for cartesian

    // Draw grid lines (optional, for aesthetics)
    g.append("g")
      .attr("class", "grid")
      .selectAll("line")
      .data(rooms) // Simplified grid logic
      .enter(); 
      
    // Draw connections (Mocked logic: if rooms are adjacent integer coords, draw line)
    // In a real graph we'd track edges explicitly, but we can infer for visual flair
    rooms.forEach(r1 => {
        rooms.forEach(r2 => {
            const dist = Math.abs(r1.coordinates.x - r2.coordinates.x) + Math.abs(r1.coordinates.y - r2.coordinates.y);
            if (dist === 1) {
                 g.append("line")
                  .attr("x1", xScale(r1.coordinates.x))
                  .attr("y1", yScale(r1.coordinates.y))
                  .attr("x2", xScale(r2.coordinates.x))
                  .attr("y2", yScale(r2.coordinates.y))
                  .attr("stroke", "#33ff00")
                  .attr("stroke-width", 1)
                  .attr("opacity", 0.3);
            }
        });
    });

    // Draw Nodes
    const nodes = g.selectAll("g.node")
      .data(rooms)
      .enter()
      .append("g")
      .attr("transform", d => `translate(${xScale(d.coordinates.x)},${yScale(d.coordinates.y)})`);

    nodes.append("circle")
      .attr("r", 15)
      .attr("fill", d => d.id === currentRoomId ? "#33ff00" : "#111")
      .attr("stroke", "#33ff00")
      .attr("stroke-width", 2);

    nodes.append("text")
      .text(d => d.name.substring(0, 10))
      .attr("dy", 25)
      .attr("text-anchor", "middle")
      .attr("fill", "#33ff00")
      .attr("font-size", "10px")
      .attr("font-family", "monospace");

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

  }, [rooms, currentRoomId]);

  return (
    <div className="w-full h-full bg-[#050505] border border-[#33ff00]/30 relative overflow-hidden">
      <div className="absolute top-2 left-2 text-[#33ff00] text-xs uppercase tracking-widest bg-black px-2 z-10">
        World Map (Live Update)
      </div>
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
};