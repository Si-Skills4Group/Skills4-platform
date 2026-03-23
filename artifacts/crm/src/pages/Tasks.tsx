import { useState } from "react";
import { Plus, Search, CheckSquare } from "lucide-react";
import { useListTasks } from "@workspace/api-client-react";
import { Button, Input, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Badge } from "@/components/ui/core-ui";

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent': return 'bg-destructive/10 text-destructive border-transparent';
    case 'high': return 'bg-amber-500/10 text-amber-700 border-transparent';
    case 'medium': return 'bg-blue-500/10 text-blue-700 border-transparent';
    default: return 'bg-muted text-muted-foreground border-transparent';
  }
};

export default function Tasks() {
  const [search, setSearch] = useState("");
  const { data: tasks, isLoading } = useListTasks({ search: search || undefined });

  return (
    <div className="space-y-6 h-full flex flex-col animate-in fade-in duration-500">
      <div className="flex sm:items-center justify-between flex-col sm:flex-row gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Tasks</h1>
          <p className="text-muted-foreground mt-1">Keep track of follow-ups and activities.</p>
        </div>
        <Button className="gap-2 shrink-0">
          <Plus size={18} />
          Add Task
        </Button>
      </div>

      <div className="flex gap-4 items-center bg-white p-2 rounded-xl border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input 
            placeholder="Search tasks..." 
            className="pl-9 border-0 shadow-none focus-visible:ring-0 bg-transparent"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : !tasks?.length ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4">
              <CheckSquare className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">No tasks found</h3>
            <p className="text-muted-foreground max-w-sm mt-2">You're all caught up! Create a new task to track an activity.</p>
            <Button className="mt-6 gap-2"><Plus size={18} /> Create Task</Button>
          </div>
        ) : (
          <div className="overflow-auto flex-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 pl-6"></TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Related To</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => {
                  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';
                  return (
                    <TableRow key={task.id} className="group cursor-pointer hover:bg-muted/30">
                      <TableCell className="pl-6">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${task.status === 'completed' ? 'bg-primary border-primary text-white' : 'border-muted-foreground/30'}`}>
                          {task.status === 'completed' && <CheckSquare size={12} />}
                        </div>
                      </TableCell>
                      <TableCell className={`font-medium ${task.status === 'completed' ? 'text-muted-foreground line-through' : ''}`}>
                        {task.title}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {task.organisationName || task.engagementTitle || '—'}
                      </TableCell>
                      <TableCell>
                        {task.dueDate ? (
                          <span className={`text-sm ${isOverdue ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                            {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge className={getPriorityColor(task.priority)}>
                          {task.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-transparent capitalize">{task.status.replace('_', ' ')}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
