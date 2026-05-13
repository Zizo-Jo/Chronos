import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CATEGORIES, type Task, type Category } from "@/lib/chronos-types";
import { minutesBetween } from "@/lib/chronos-store";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultDate?: string;
  initial?: Task | null;
  onSave: (t: Task) => void;
}

export function TaskDialog({ open, onOpenChange, defaultDate, initial, onSave }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>("study");
  const [date, setDate] = useState(defaultDate ?? new Date().toISOString().slice(0, 10));
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");

  useEffect(() => {
    if (open) {
      if (initial) {
        setTitle(initial.title);
        setDescription(initial.description ?? "");
        setCategory(initial.category);
        setDate(initial.date);
        setStart(initial.start);
        setEnd(initial.end);
      } else {
        setTitle("");
        setDescription("");
        setCategory("study");
        setDate(defaultDate ?? new Date().toISOString().slice(0, 10));
        setStart("09:00");
        setEnd("10:00");
      }
    }
  }, [open, initial, defaultDate]);

  // Story 1 — validation
  const submit = () => {
    if (!title.trim()) return toast.error("Title is required.");
    if (!start) return toast.error("Beginning hour is required.");
    if (!end) return toast.error("Finishing hour is required.");
    if (minutesBetween(start, end) <= 0)
      return toast.error("Finishing hour must be after the starting hour.");

    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      title: title.trim(),
      description: description.trim() || undefined,
      category,
      date,
      start,
      end,
      completed: initial?.completed ?? false,
    });
    onOpenChange(false);
    toast.success(initial ? "Task rescheduled." : "Task added to calendar.");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {initial ? "Reschedule task" : "New task"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="title">Title *</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Linear algebra study" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="desc">Description</Label>
            <Textarea id="desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Category</Label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                {CATEGORIES.filter((c) => c.value !== "break").map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="start">Start *</Label>
              <Input id="start" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="end">End *</Label>
              <Input id="end" type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>{initial ? "Save changes" : "Add task"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
