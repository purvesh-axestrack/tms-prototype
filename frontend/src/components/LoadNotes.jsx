import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getLoadNotes, createLoadNote, updateLoadNote, deleteLoadNote } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { MessageSquare, Pencil, Trash2, X, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

export default function LoadNotes({ loadId }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newNote, setNewNote] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['loadNotes', loadId],
    queryFn: () => getLoadNotes(loadId),
    enabled: !!loadId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['loadNotes', loadId] });

  const createMut = useMutation({
    mutationFn: (note) => createLoadNote(loadId, note),
    onSuccess: () => { invalidate(); setNewNote(''); toast.success('Note added'); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to add note'),
  });

  const updateMut = useMutation({
    mutationFn: ({ noteId, note }) => updateLoadNote(loadId, noteId, note),
    onSuccess: () => { invalidate(); setEditingId(null); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to update note'),
  });

  const deleteMut = useMutation({
    mutationFn: (noteId) => deleteLoadNote(loadId, noteId),
    onSuccess: invalidate,
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to delete note'),
  });

  const handleSubmit = () => {
    if (!newNote.trim()) return;
    createMut.mutate(newNote.trim());
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Card className="py-4">
      <CardContent>
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="w-4 h-4 text-muted-foreground" />
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Notes ({notes.length})
          </div>
        </div>

        {/* Note list */}
        <div className="space-y-3 max-h-64 overflow-y-auto mb-3">
          {isLoading && <div className="text-xs text-muted-foreground">Loading...</div>}
          {!isLoading && notes.length === 0 && (
            <div className="text-xs text-muted-foreground italic py-2">No notes yet</div>
          )}
          {notes.map((n) => {
            const isOwn = user?.id === n.user_id;
            const isEditing = editingId === n.id;
            return (
              <div key={n.id} className="flex gap-2 group">
                <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                  <AvatarFallback className="text-[10px] font-bold bg-muted">
                    {n.user_name?.split(' ').map(w => w[0]).join('') || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold">{n.user_name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </span>
                    {isOwn && !isEditing && (
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => { setEditingId(n.id); setEditText(n.note); }}>
                          <Pencil className="w-2.5 h-2.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-5 w-5 text-red-500 hover:text-red-700">
                              <Trash2 className="w-2.5 h-2.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete note?</AlertDialogTitle>
                              <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteMut.mutate(n.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>
                  {isEditing ? (
                    <div className="mt-1 space-y-1">
                      <Textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={2}
                        className="text-sm"
                        autoFocus
                      />
                      <div className="flex gap-1">
                        <Button size="sm" className="h-6 text-xs" onClick={() => updateMut.mutate({ noteId: n.id, note: editText })} disabled={updateMut.isPending}>
                          {updateMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Save
                        </Button>
                        <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setEditingId(null)}>
                          <X className="w-3 h-3" /> Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap break-words">{n.note}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Add note input */}
        <div className="flex gap-2">
          <Textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a note... (Ctrl+Enter to submit)"
            rows={2}
            className="text-sm flex-1"
          />
          <Button
            size="sm"
            className="self-end theme-brand-bg text-white"
            onClick={handleSubmit}
            disabled={!newNote.trim() || createMut.isPending}
          >
            {createMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Add'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
