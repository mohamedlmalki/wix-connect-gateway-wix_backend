import { useState, useEffect, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
    DialogFooter,
} from "@/components/ui/dialog";
import { Building, PlusCircle, RefreshCw, Terminal, Trash2, Pencil } from "lucide-react";
import Navbar from "@/components/Navbar";

const API_BASE_URL = "/_functions";

interface LogEntry {
    _id: string;
    _createdDate: string;
    message: string;
    status: 'SUCCESS' | 'ERROR' | 'INFO';
    context: string;
}

// Interface now matches your CMS structure based on your working backup
interface ManagedSite {
    _id: string;
    siteName: string;
    siteId: string;
    clientId: string; // This matches your working backup
    templateId?: string;
    siteDomain?: string;
    notes?: string;      // This matches your working backup
    campaignId?: string;
}

const SiteManagement = () => {
    // State for forms (used for both Add and Edit)
    const [formSiteName, setFormSiteName] = useState("");
    const [formSiteId, setFormSiteId] = useState("");
    const [formClientId, setFormClientId] = useState("");
    const [formTemplateId, setFormTemplateId] = useState("");
    const [formSiteDomain, setFormSiteDomain] = useState("");
    const [formNotes, setFormNotes] = useState("");
    const [formCampaignId, setFormCampaignId] = useState("");

    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingSite, setEditingSite] = useState<ManagedSite | null>(null);

    const [sites, setSites] = useState<ManagedSite[]>([]);
    const [isLoadingSites, setIsLoadingSites] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isLoadingLogs, setIsLoadingLogs] = useState(true);
    const [isClearingLogs, setIsClearingLogs] = useState(false);
    
    const loadSites = async () => {
        setIsLoadingSites(true);
        try {
            const response = await fetch(`${API_BASE_URL}/listSites`);
            if (!response.ok) throw new Error('Failed to fetch sites.');
            const data = await response.json();
            setSites(data);
        } catch (error) {
            toast.error("Error fetching managed sites.");
        } finally {
            setIsLoadingSites(false);
        }
    };

    const fetchLogs = async () => {
        setIsLoadingLogs(true);
        try {
            const response = await fetch(`${API_BASE_URL}/logs`);
            if (!response.ok) throw new Error('Failed to fetch logs.');
            const logData = await response.json();
            setLogs(logData);
        } catch (error) {
            toast.error("Could not load backend activity logs.");
        } finally {
            setIsLoadingLogs(false);
        }
    };
    
    useEffect(() => {
        loadSites();
        fetchLogs();
    }, []);

    const resetAddForm = () => {
        setFormSiteName("");
        setFormSiteId("");
        setFormClientId("");
        setFormTemplateId("");
        setFormSiteDomain("");
        setFormNotes("");
        setFormCampaignId("");
    };

    const handleOpenEditDialog = (site: ManagedSite) => {
        setEditingSite(site);
        setFormSiteName(site.siteName);
        setFormSiteId(site.siteId);
        setFormClientId(site.clientId);
        setFormTemplateId(site.templateId || "");
        setFormSiteDomain(site.siteDomain || "");
        setFormNotes(site.notes || "");
        setFormCampaignId(site.campaignId || "");
        setIsEditDialogOpen(true);
    };

    const handleFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isSubmitting) return;
        setIsSubmitting(true);
        
        const siteDataPayload = {
            siteName: formSiteName,
            siteId: formSiteId,
            apiKey: formClientId,
            templateId: formTemplateId,
            siteDomain: formSiteDomain,
            notes: formNotes,
            campaignId: formCampaignId
        };
        
        const isEditing = !!editingSite;
        const url = isEditing ? `${API_BASE_URL}/updateSite` : `${API_BASE_URL}/addSite`;
        const body = isEditing ? { ...siteDataPayload, itemId: editingSite._id } : siteDataPayload;
        const successMessage = isEditing ? `Site "${siteDataPayload.siteName}" updated!` : `Site "${siteDataPayload.siteName}" added!`;

        try {
            const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'An unknown error occurred.');
            }
            toast.success(successMessage);

            // *** FIX START ***
            // Add campaignId to the payload sent to the local middleware
            const localConfigPayload = {
                siteName: formSiteName,
                siteId: formSiteId,
                apiKey: formClientId,
                campaignId: formCampaignId,
                originalSiteId: isEditing ? editingSite.siteId : undefined,
            };
            // *** FIX END ***

            const localConfigResponse = await fetch('/api/headless-add-site', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(localConfigPayload),
            });

            if (!localConfigResponse.ok) {
                const err = await localConfigResponse.json();
                throw new Error(err.message || 'CMS updated, but failed to update local config.');
            }
            
            toast.success("Local configuration file was updated successfully.");
            
            if (isEditing) {
                setIsEditDialogOpen(false);
                setEditingSite(null);
            }
            resetAddForm();
            await Promise.all([loadSites(), fetchLogs()]);
        } catch (error) {
            if (error instanceof Error) toast.error(`Operation failed: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteSite = async (itemId: string, siteName: string, siteId: string) => {
        try {
            // First, delete from Wix CMS
            const response = await fetch(`${API_BASE_URL}/deleteSite`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemId }),
            });

            if (!response.ok) {
                // Handle potential JSON error response from Wix
                const errorText = await response.text();
                try {
                    const errorData = JSON.parse(errorText);
                    throw new Error(errorData.error || 'Failed to delete site from CMS.');
                } catch (e) {
                     // If parsing fails, the response was likely empty or not JSON
                    throw new Error(errorText || 'Failed to delete site from CMS.');
                }
            }
            toast.success(`Site "${siteName}" was deleted successfully from CMS.`);

            // Then, delete from the local config file
            const localConfigResponse = await fetch('/api/headless-delete-site', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ siteId }),
            });
            if (!localConfigResponse.ok) {
                const errorData = await localConfigResponse.json();
                throw new Error(errorData.message || 'Failed to delete site from local config.');
            }
            toast.success(`Site "${siteName}" was also deleted from local config.`);

            await Promise.all([loadSites(), fetchLogs()]);
        } catch (error) {
            if (error instanceof Error) toast.error(error.message);
            await fetchLogs();
        }
    };
    
    const handleClearLogs = async () => {
        setIsClearingLogs(true);
        try {
            const response = await fetch(`${API_BASE_URL}/clearLogs`, { method: 'POST' });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to clear logs.');
            }
            toast.success(`Successfully cleared log entries.`);
            await fetchLogs();
        } catch (error) {
            if (error instanceof Error) toast.error(error.message);
        } finally {
            setIsClearingLogs(false);
        }
    };

    const getStatusColor = (status: LogEntry['status']) => {
        switch (status) {
            case 'SUCCESS': return 'text-green-400';
            case 'ERROR': return 'text-red-400';
            case 'INFO': return 'text-blue-400';
            default: return 'text-gray-400';
        }
    };

    return (
        <div className="min-h-screen bg-gradient-subtle">
            <Navbar />
            <div className="container mx-auto px-4 pt-24 pb-12">
                <div className="max-w-4xl mx-auto space-y-8">
                    <div className="flex items-center gap-4 animate-fade-in">
                        <Building className="h-10 w-10 text-primary" />
                        <div>
                            <h1 className="text-3xl font-bold">Site Management</h1>
                            <p className="text-muted-foreground">Add, view, and remove your managed Wix sites.</p>
                        </div>
                    </div>
                    
                    <Card className="bg-gradient-card shadow-card border-primary/10">
                        <form onSubmit={handleFormSubmit}>
                             <CardHeader>
                                 <CardTitle className="flex items-center gap-2"><PlusCircle className="h-5 w-5" />Add a New Site</CardTitle>
                             </CardHeader>
                             <CardContent className="space-y-4">
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     <div className="space-y-2"><Label>Site Name</Label><Input value={formSiteName} onChange={(e) => setFormSiteName(e.target.value)} required /></div>
                                     <div className="space-y-2"><Label>Site ID</Label><Input value={formSiteId} onChange={(e) => setFormSiteId(e.target.value)} required /></div>
                                     <div className="space-y-2"><Label>Site Domain</Label><Input value={formSiteDomain} onChange={(e) => setFormSiteDomain(e.target.value)} required /></div>
                                     <div className="space-y-2"><Label>Client ID (API Key)</Label><Input value={formClientId} onChange={(e) => setFormClientId(e.target.value)} required /></div>
                                     <div className="space-y-2"><Label>Triggered Email Template ID</Label><Input value={formTemplateId} onChange={(e) => setFormTemplateId(e.target.value)} /></div>
                                     <div className="space-y-2"><Label>Campaign ID</Label><Input value={formCampaignId} onChange={(e) => setFormCampaignId(e.target.value)} /></div>
                                 </div>
                                 <div className="space-y-2"><Label>Notes</Label><Textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} /></div>
                             </CardContent>
                             <CardFooter>
                                 <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Add Site'}</Button>
                             </CardFooter>
                         </form>
                    </Card>

                    <Card className="bg-gradient-card shadow-card border-primary/10">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div><CardTitle>Managed Sites</CardTitle><CardDescription>List of all sites currently managed.</CardDescription></div>
                            <Button variant="outline" size="icon" onClick={loadSites} disabled={isLoadingSites}><RefreshCw className={`h-4 w-4 ${isLoadingSites ? 'animate-spin' : ''}`} /></Button>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Site Name</TableHead>
                                        <TableHead>Site Domain</TableHead>
                                        <TableHead>Template ID</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoadingSites ? (
                                        <TableRow><TableCell colSpan={4} className="text-center">Loading sites...</TableCell></TableRow>
                                    ) : sites.length > 0 ? (
                                        sites.map((site) => (
                                            <TableRow key={site._id}>
                                                <TableCell className="font-medium">{site.siteName}</TableCell>
                                                <TableCell>{site.siteDomain || 'N/A'}</TableCell>
                                                <TableCell>{site.templateId || 'N/A'}</TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex gap-2 justify-end">
                                                        <Button variant="outline" size="sm" onClick={() => handleOpenEditDialog(site)}><Pencil className="h-4 w-4 mr-2" /> Edit</Button>
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild><Button variant="destructive" size="sm">Delete</Button></AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                                    <AlertDialogDescription>This will permanently delete the <strong>{site.siteName}</strong> entry.</AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                    <AlertDialogAction onClick={() => handleDeleteSite(site._id, site.siteName, site.siteId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Yes, delete it</AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow><TableCell colSpan={4} className="text-center">No managed sites found.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                        <DialogContent className="sm:max-w-xl">
                            <form onSubmit={handleFormSubmit}>
                                <DialogHeader>
                                    <DialogTitle>Edit Site: {editingSite?.siteName}</DialogTitle>
                                    <DialogDescription>Make changes and click save.</DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2"><Label>Site Name</Label><Input value={formSiteName} onChange={(e) => setFormSiteName(e.target.value)} required /></div>
                                        <div className="space-y-2"><Label>Site ID</Label><Input value={formSiteId} onChange={(e) => setFormSiteId(e.target.value)} required /></div>
                                        <div className="space-y-2"><Label>Site Domain</Label><Input value={formSiteDomain} onChange={(e) => setFormSiteDomain(e.target.value)} required /></div>
                                        <div className="space-y-2"><Label>Client ID (API Key)</Label><Input value={formClientId} onChange={(e) => setFormClientId(e.target.value)} required /></div>
                                        <div className="space-y-2"><Label>Triggered Email Template ID</Label><Input value={formTemplateId} onChange={(e) => setFormTemplateId(e.target.value)} /></div>
                                        <div className="space-y-2"><Label>Campaign ID</Label><Input value={formCampaignId} onChange={(e) => setFormCampaignId(e.target.value)} /></div>
                                    </div>
                                    <div className="space-y-2"><Label>Notes</Label><Textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} /></div>
                                </div>
                                <DialogFooter>
                                    <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
                                    <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Changes'}</Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                    
                    <Card className="bg-gradient-card shadow-card border-primary/10">
                       <CardHeader className="flex flex-row items-center justify-between">
                           <div>
                               <CardTitle className="flex items-center gap-2"><Terminal className="h-5 w-5" />Backend Activity Log</CardTitle>
                               <CardDescription>Recent events from the backend functions.</CardDescription>
                           </div>
                           <div className="flex items-center gap-2">
                               <AlertDialog>
                                   <AlertDialogTrigger asChild><Button variant="destructive" size="icon" disabled={isClearingLogs}><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                                   <AlertDialogContent>
                                       <AlertDialogHeader><AlertDialogTitle>Clear All Logs?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                       <AlertDialogFooter>
                                           <AlertDialogCancel>Cancel</AlertDialogCancel>
                                           <AlertDialogAction onClick={handleClearLogs} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{isClearingLogs ? 'Clearing...' : 'Yes, Clear Logs'}</AlertDialogAction>
                                       </AlertDialogFooter>
                                   </AlertDialogContent>
                               </AlertDialog>
                               <Button variant="outline" size="icon" onClick={fetchLogs} disabled={isLoadingLogs}><RefreshCw className={`h-4 w-4 ${isLoadingLogs ? 'animate-spin' : ''}`} /></Button>
                           </div>
                        </CardHeader>
                       <CardContent>
                            <div className="bg-gray-900 text-white font-mono text-sm p-4 rounded-md h-64 overflow-y-auto">
                                {isLoadingLogs ? ( <p>Loading logs...</p> ) : 
                                 logs.length > 0 ? (
                                     logs.map(log => (
                                         log && <div key={log._id} className="whitespace-pre-wrap">
                                             <span>{new Date(log._createdDate).toLocaleTimeString()}&nbsp;</span>
                                             <span className={getStatusColor(log.status)}>[{log.status}]</span>
                                             <span>&nbsp;{log.message}</span>
                                         </div>
                                     ))
                                 ) : ( <p>No log entries found.</p> )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};
export default SiteManagement;
