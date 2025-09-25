import * as React from "react";

import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Textarea } from "~/components/ui/textarea";

type Note = {
  _id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  color: string;
  z: number;
};

type Props = {
  note: Note;
  onDragEnd: (position: { x: number; y: number }) => void;
  onChange: (value: string) => void;
  onRemove: () => void;
};

export function NoteCard({ note, onDragEnd, onChange, onRemove }: Props) {
  const [position, setPosition] = React.useState({ x: note.x, y: note.y });
  const [value, setValue] = React.useState(note.text);
  const draggingRef = React.useRef(false);
  const dragStart = React.useRef({ x: 0, y: 0 });

  React.useEffect(() => {
    setPosition({ x: note.x, y: note.y });
  }, [note.x, note.y]);

  React.useEffect(() => {
    setValue(note.text);
  }, [note.text]);

  const commitDrag = React.useCallback(() => {
    onDragEnd({ x: position.x, y: position.y });
  }, [onDragEnd, position.x, position.y]);

  return (
    <div
      style={{
        left: position.x,
        top: position.y,
        width: note.width,
        height: note.height,
        zIndex: note.z,
      }}
      className="absolute"
    >
      <Card
        className="grid h-full w-full gap-2 border-none p-3 text-sm text-foreground shadow-lg"
        style={{ backgroundColor: note.color }}
      >
        <div
          className="flex items-center justify-between gap-2 text-xs font-medium text-foreground/80"
          onPointerDown={(event) => {
            draggingRef.current = true;
            dragStart.current = {
              x: event.clientX - position.x,
              y: event.clientY - position.y,
            };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (!draggingRef.current) {
              return;
            }
            setPosition({
              x: event.clientX - dragStart.current.x,
              y: event.clientY - dragStart.current.y,
            });
          }}
          onPointerUp={(event) => {
            if (!draggingRef.current) {
              return;
            }
            draggingRef.current = false;
            event.currentTarget.releasePointerCapture(event.pointerId);
            commitDrag();
          }}
          onPointerLeave={() => {
            if (!draggingRef.current) {
              return;
            }
            draggingRef.current = false;
            commitDrag();
          }}
        >
          <span className="cursor-grab select-none">Drag</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => onRemove()}
          >
            Remove
          </Button>
        </div>

        <Textarea
          value={value}
          onChange={(event) => {
            const text = event.target.value;
            setValue(text);
          }}
          onBlur={() => {
            if (value !== note.text) {
              onChange(value);
            }
          }}
          className="min-h-0 flex-1 resize-none bg-white/70 text-sm text-foreground/90 backdrop-blur-sm"
        />
      </Card>
    </div>
  );
}
