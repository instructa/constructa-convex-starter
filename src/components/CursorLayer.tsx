import * as React from "react";

type PeerCursor = {
  sessionId: string;
  name: string;
  color: string;
  x: number;
  y: number;
};

type CurrentUser = {
  sessionId: string;
  name: string;
  color: string;
};

export function CursorLayer({ me, peers }: { me: CurrentUser; peers: PeerCursor[] }) {
  return (
    <svg className="pointer-events-none absolute inset-0 size-full" aria-hidden>
      {peers
        .filter((peer) => peer.sessionId !== me.sessionId)
        .map((peer) => (
          <g key={peer.sessionId} transform={`translate(${peer.x}, ${peer.y})`}>
            <path
              d="M0 0 L10 18 L7 18 L5 24 L3 18 L0 18 Z"
              fill={peer.color}
              opacity={0.85}
            />
            <text x={12} y={8} fontSize={12} fill="var(--background)" stroke="var(--foreground)" strokeWidth={0.4}>
              {peer.name}
            </text>
          </g>
        ))}
    </svg>
  );
}
