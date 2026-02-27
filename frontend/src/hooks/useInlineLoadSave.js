import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateLoad } from '../services/api';
import { toast } from 'sonner';

export default function useInlineLoadSave(loadId) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (updates) => updateLoad(loadId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loads'] });
      queryClient.invalidateQueries({ queryKey: ['loads', loadId] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to save');
    },
  });

  const saveField = (name, value) => {
    mutation.mutate({ [name]: value });
  };

  const saveFields = (updates) => {
    mutation.mutate(updates);
  };

  return { saveField, saveFields, isSaving: mutation.isPending };
}
