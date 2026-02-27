import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getGmailStatus, getGmailAuthUrl, disconnectGmail, triggerGmailSync, updateFilterSenders } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { RefreshCw, Unplug, Plus, X } from 'lucide-react';
import { toast } from 'sonner';

export default function GmailConnectionCard() {
  const [syncing, setSyncing] = useState(false);
  const [senderInput, setSenderInput] = useState('');
  const [showDisconnect, setShowDisconnect] = useState(false);
  const queryClient = useQueryClient();

  const { data: gmailStatus, isLoading } = useQuery({
    queryKey: ['gmail-status'],
    queryFn: getGmailStatus,
    refetchInterval: 60000,
  });

  const handleConnect = async () => {
    try {
      const { url } = await getGmailAuthUrl();
      window.location.href = url;
    } catch (error) {
      toast.error('Failed to get auth URL. Check that Gmail credentials are configured on the server.');
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectGmail();
      toast.success('Gmail disconnected');
      queryClient.invalidateQueries({ queryKey: ['gmail-status'] });
    } catch (err) {
      toast.error('Failed to disconnect: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await triggerGmailSync();
      queryClient.invalidateQueries({ queryKey: ['email-imports'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['loads'] });
      toast.success(`Sync complete: ${result.processed || 0} messages processed`);
    } catch (error) {
      toast.error('Sync failed: ' + (error.response?.data?.error || error.message));
    } finally {
      setSyncing(false);
    }
  };

  const handleAddSender = async () => {
    if (!senderInput.trim()) return;
    const current = gmailStatus?.filter_senders || [];
    const updated = [...current, senderInput.trim()];
    await updateFilterSenders(updated);
    setSenderInput('');
    queryClient.invalidateQueries({ queryKey: ['gmail-status'] });
    toast.success('Sender added');
  };

  const handleRemoveSender = async (sender) => {
    const current = gmailStatus?.filter_senders || [];
    const updated = current.filter(s => s !== sender);
    await updateFilterSenders(updated);
    queryClient.invalidateQueries({ queryKey: ['gmail-status'] });
    toast.success('Sender removed');
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-8 w-1/4" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="font-display">Gmail Connection</CardTitle>
        </CardHeader>
        <CardContent>
          {gmailStatus?.connected ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-green-500" />
                <Badge className="bg-green-100 text-green-700">Connected</Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Email:</span>
                  <span className="ml-2 font-medium">{gmailStatus.email_address}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Last Sync:</span>
                  <span className="ml-2 font-medium">
                    {gmailStatus.last_sync_at
                      ? new Date(gmailStatus.last_sync_at).toLocaleString()
                      : 'Never'}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSync} disabled={syncing} className="theme-brand-bg text-white">
                  <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Syncing...' : 'Sync Now'}
                </Button>
                <Button variant="outline" onClick={() => setShowDisconnect(true)} className="text-red-600 border-red-300 hover:bg-red-50">
                  <Unplug className="w-4 h-4" /> Disconnect
                </Button>
              </div>

              <Separator />

              <div>
                <h4 className="text-sm font-semibold mb-2">Sender Whitelist (optional)</h4>
                <p className="text-xs text-muted-foreground mb-2">
                  Only process emails from these senders. Leave empty to process all matching emails.
                </p>

                <div className="flex gap-2 mb-2">
                  <Input
                    value={senderInput}
                    onChange={(e) => setSenderInput(e.target.value)}
                    placeholder="e.g., broker@company.com"
                    className="flex-1"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddSender()}
                  />
                  <Button size="sm" onClick={handleAddSender} className="theme-brand-bg text-white">
                    <Plus className="w-4 h-4" /> Add
                  </Button>
                </div>

                {gmailStatus.filter_senders?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {gmailStatus.filter_senders.map(sender => (
                      <Badge key={sender} variant="secondary" className="gap-1">
                        {sender}
                        <button onClick={() => handleRemoveSender(sender)} className="text-muted-foreground hover:text-red-500">
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-slate-300" />
                <Badge variant="secondary">Not Connected</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Connect your Gmail account to automatically detect incoming rate confirmations
                and create draft loads.
              </p>
              <Button onClick={handleConnect} className="theme-brand-bg text-white">
                Connect Gmail
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showDisconnect} onOpenChange={setShowDisconnect}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Gmail</AlertDialogTitle>
            <AlertDialogDescription>Disconnect Gmail? This will stop email monitoring.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => { handleDisconnect(); setShowDisconnect(false); }}>
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
