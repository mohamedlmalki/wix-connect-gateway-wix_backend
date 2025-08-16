import { useState, useEffect, FormEvent, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
    DialogFooter
} from "@/components/ui/dialog";
import { UserPlus, PlayCircle, Building, Terminal, RefreshCw, Trash2, CheckCircle, XCircle, FileJson, Clock, PauseCircle, StopCircle, Search, Save, Timer, Download, Link, Code } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { useJobs, ImportJobState } from "../App";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const API_BASE_URL = "/_functions";

interface LogEntry {
    _id: string;
    _createdDate: string;
    status: 'INFO' | 'SUCCESS' | 'ERROR';
    message: string;
    context: string;
}

interface ManagedSite {
    _id: string;
    siteName: string;
    siteId: string;
    campaignId?: string;
}

interface MemberToDelete {
    memberId: string;
    contactId: string;
}

interface SenderDetails {
    fromName: string;
    fromEmail: string;
}

const AdminImport = () => {
    const { importJobs, setImportJobs } = useJobs();
    const [sites, setSites] = useState<ManagedSite[]>([]);
    const [selectedSite, setSelectedSite] = useState("");
    const [isLoadingSites, setIsLoadingSites] = useState(true);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isLoadingLogs, setIsLoadingLogs] = useState(true);
    const [isClearingLogs, setIsClearingLogs] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedMembers, setSelectedMembers] = useState<MemberToDelete[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [senderDetails, setSenderDetails] = useState<SenderDetails | null>(null);
    const [isFetchingSender, setIsFetchingSender] = useState(false);
    const [isUpdatingSender, setIsUpdatingSender] = useState(false);
    const [resultFilter, setResultFilter] = useState<'ALL' | 'SUCCESS' | 'ERROR'>('ALL');

    // State for the new dialogs
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [actionResponse, setActionResponse] = useState("");
    const [htmlToValidate, setHtmlToValidate] = useState("<a href='https://example.com'>Example</a>");
    const [urlToValidate, setUrlToValidate] = useState("https://www.wix.com");

    const createNewJobState = (): ImportJobState => ({
        recipientEmails: "",
        importResults: [],
        progress: 0,
        countdown: 0,
        isSubmitting: false,
        isPaused: false,
        jobPaused: { current: false },
        jobCancelled: { current: false },
        customSubject: "Welcome to Our Community!",
        delaySeconds: 3,
        jobCompleted: false,
        elapsedTime: 0,
    });

    const activeJob = importJobs[selectedSite] || createNewJobState();

    const updateActiveJob = (newJobState: Partial<ImportJobState>) => {
        setImportJobs(prevJobs => ({
            ...prevJobs,
            [selectedSite]: {
                ...(prevJobs[selectedSite] || createNewJobState()),
                ...newJobState,
            },
        }));
    };

    const formatTime = (ms: number) => {
        if (ms < 0) return "00:00";
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        const padded = (num: number) => num.toString().padStart(2, '0');
        if (hours > 0) return `${padded(hours)}:${padded(minutes)}:${padded(seconds)}`;
        return `${padded(minutes)}:${padded(seconds)}`;
    };

    const fetchSenderDetails = async (siteId: string) => {
        if (!siteId) return;
        setIsFetchingSender(true);
        setSenderDetails(null);
        try {
            const response = await fetch(`${API_BASE_URL}/getSenderDetailsFromSite`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetSiteId: siteId }),
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.body?.error || 'Failed to fetch sender details.');
            }
            const data = await response.json();
            setSenderDetails(data.senderDetails);
        } catch (error: any) {
            toast.error("Error fetching sender details", { description: error.message });
        } finally {
            setIsFetchingSender(false);
        }
    };

    const handleUpdateSenderName = async () => {
        if (!senderDetails || !selectedSite) return;
        setIsUpdatingSender(true);
        try {
            const response = await fetch(`${API_BASE_URL}/updateSenderDetailsOnSite`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    targetSiteId: selectedSite,
                    fromName: senderDetails.fromName,
                    fromEmail: senderDetails.fromEmail
                }),
            });
            if (!response.ok) {
                 const err = await response.json();
                throw new Error(err.body?.error || 'Failed to update sender name.');
            }
            const data = await response.json();
            toast.success("Sender name updated successfully.", {
                description: data.verificationNeeded ? "Verification may be required." : ""
            });
        } catch (error: any) {
            toast.error("Update Failed", { description: error.message });
        } finally {
            setIsUpdatingSender(false);
        }
    };

    const emailCount = activeJob.recipientEmails.split(/[,\s\n]+/).map(email => email.trim()).filter(email => email.includes('@')).length;

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const loadSites = async () => {
        setIsLoadingSites(true);
        try {
            const response = await fetch(`${API_BASE_URL}/listSites`);
            if (!response.ok) throw new Error('Failed to fetch sites.');
            const siteList = await response.json();
            setSites(siteList);
            if (siteList.length > 0) {
                const initialSiteId = siteList[0].siteId;
                setSelectedSite(initialSiteId);
                fetchSenderDetails(initialSiteId);
            }
        } catch (error: any) {
            toast.error("Error loading sites", { description: error.message });
        } finally {
            setIsLoadingSites(false);
        }
    };

    const fetchLogs = async () => {
        setIsLoadingLogs(true);
        try {
            const response = await fetch(`${API_BASE_URL}/logs`);
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Failed to fetch logs.');
            };
            const logData = await response.json();
            setLogs(logData);
        } catch (error: any) {
            toast.error("Error loading logs", { description: error.message });
        } finally {
            setIsLoadingLogs(false);
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

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!selectedSite || !activeJob.recipientEmails) {
            toast.warning("Missing Information", { description: "Please select a site and provide at least one email." });
            return;
        }
        
        const currentJob = importJobs[selectedSite] || createNewJobState();
        currentJob.jobCancelled.current = false;
        currentJob.jobPaused.current = false;

        updateActiveJob({
            isSubmitting: true,
            isPaused: false,
            progress: 0,
            importResults: [],
            elapsedTime: 0,
            jobCompleted: false,
            jobCancelled: currentJob.jobCancelled,
            jobPaused: currentJob.jobPaused,
        });


        const emailsToImport = activeJob.recipientEmails
            .split(/[,\s\n]+/)
            .map(email => email.trim())
            .filter(email => email.includes('@'));
        const totalEmails = emailsToImport.length;
        if (totalEmails === 0) {
            toast.warning("No Valid Emails", { description: "No valid email addresses found to import." });
            updateActiveJob({ isSubmitting: false });
            return;
        }
        toast.info(`Starting import for ${totalEmails} user(s)...`);

        for (let i = 0; i < totalEmails; i++) {
            if (currentJob.jobCancelled.current) {
                toast.error("Import job terminated by user.");
                break;
            }
            while (currentJob.jobPaused.current) {
                if (currentJob.jobCancelled.current) break;
                await sleep(200);
            }
            if (currentJob.jobCancelled.current) break;
            const email = emailsToImport[i];
            const delaySeconds = importJobs[selectedSite]?.delaySeconds || 3;
            if (i > 0 && delaySeconds > 0) {
                for (let j = delaySeconds; j > 0; j--) {
                    if (currentJob.jobCancelled.current || currentJob.jobPaused.current) break;
                    updateActiveJob({ countdown: j });
                    await sleep(1000);
                }
                updateActiveJob({ countdown: 0 });
            }
            if (currentJob.jobCancelled.current || currentJob.jobPaused.current) continue;
            
            setImportJobs(prevJobs => ({
                ...prevJobs,
                [selectedSite]: {
                    ...prevJobs[selectedSite],
                    importResults: [...prevJobs[selectedSite].importResults, { email, status: 'PENDING', message: 'Importing...' }]
                }
            }));


            try {
                const response = await fetch(`${API_BASE_URL}/importUsers`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        targetSiteId: selectedSite,
                        email: email,
                        customSubject: activeJob.customSubject,
                    })
                });
                const responseText = await response.text();
                if (!responseText) {
                    throw new Error("Received an empty response from the server.");
                }
                const result = JSON.parse(responseText);
                if (!response.ok || result.status === 'ERROR') {
                    throw new Error(result.message || "An unknown error occurred during import.");
                }

                setImportJobs(prevJobs => ({
                    ...prevJobs,
                    [selectedSite]: {
                        ...prevJobs[selectedSite],
                        importResults: prevJobs[selectedSite].importResults.map(res =>
                            res.email === email ? { ...res, status: 'SUCCESS', message: result.message, details: result } : res
                        )
                    }
                }));

            } catch (error) {
                const errorMessage = (error instanceof Error) ? error.message : "An unknown error occurred.";

                setImportJobs(prevJobs => ({
                    ...prevJobs,
                    [selectedSite]: {
                        ...prevJobs[selectedSite],
                        importResults: prevJobs[selectedSite].importResults.map(res =>
                            res.email === email ? { ...res, status: 'ERROR', message: errorMessage, details: { error: errorMessage } } : res
                        )
                    }
                }));
            }
            updateActiveJob({ progress: ((i + 1) / totalEmails) * 100 });
        }
        if (!currentJob.jobCancelled.current) {
            toast.success("Import process finished.", {
                description: "Search results will refresh shortly to reflect changes."
            });
        }
        updateActiveJob({ isSubmitting: false, isPaused: false, jobCompleted: true });
        await fetchLogs();
    };

    const handlePauseResume = () => {
        const newPausedState = !activeJob.isPaused;
        
        if (activeJob.jobPaused) {
            activeJob.jobPaused.current = newPausedState;
        }

        updateActiveJob({ isPaused: newPausedState });

        if (newPausedState) {
            toast.info("Import job paused.");
        } else {
            toast.info("Import job resumed.");
        }
    };

    const handleEndJob = () => {
        if (activeJob.jobCancelled) {
            activeJob.jobCancelled.current = true;
        }
        if (activeJob.jobPaused) {
            activeJob.jobPaused.current = false;
        }
        updateActiveJob({ isPaused: false, isSubmitting: false });
    };

    const handleSearch = async () => {
        if (!selectedSite) {
            toast.warning("Please select a site to search.");
            return;
        }
        if (!searchQuery) {
            toast.warning("Please enter a search query.");
            return;
        }
        setIsSearching(true);
        setSelectedMembers([]);
        setSearchResults([]);
        toast.info(`Searching for members matching "${searchQuery}"...`);

        try {
            const response = await fetch(`/api/headless-search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    siteId: selectedSite,
                    query: searchQuery,
                }),
            });
            
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "An unknown search error occurred.");
            }
            
            const foundMembers = result.members || [];
            setSearchResults(foundMembers);
            
            if (foundMembers.length > 0) {
                toast.success(`Search complete. Found ${foundMembers.length} member(s).`);
            } else {
                const justImported = activeJob.importResults.some(res => res.email === searchQuery && res.status === 'SUCCESS');
                if (justImported) {
                    toast.info("Member not found.", { description: "It can take a few moments for a newly imported member to appear in search results. Please try again shortly." });
                } else {
                    toast.info("Search complete. No members found matching your query.");
                }
            }
        } catch (error) {
            const errorMessage = (error instanceof Error) ? error.message : "An unknown error occurred.";
            toast.error("Search Failed", { description: errorMessage });
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedMembers.length === 0) return;
        setIsDeleting(true);
        toast.info(`Deleting ${selectedMembers.length} selected member(s)...`);

        try {
            const response = await fetch(`/api/headless-delete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    siteId: selectedSite,
                    membersToDelete: selectedMembers,
                }),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || "An unknown error occurred during deletion.");
            }
            toast.success(result.message || "Deletion process initiated successfully.");
        } catch (error) {
            const errorMessage = (error instanceof Error) ? error.message : "A network error occurred.";
            toast.error("Deletion Failed", { description: errorMessage });
        } finally {
            setIsDeleting(false);
            setSelectedMembers([]);
            await handleSearch();
        }
    };

    useEffect(() => {
        loadSites();
        fetchLogs();
    }, []);
    
    useEffect(() => {
        if (selectedSite && !importJobs[selectedSite]) {
            setImportJobs(prev => ({ ...prev, [selectedSite]: createNewJobState() }));
        }
    }, [selectedSite, importJobs, setImportJobs]);

    // Handlers for the new action dialogs
    const handleValidateHtml = async () => {
        if (!selectedSite || !htmlToValidate) {
            toast.warning("Please select a site and provide HTML content.");
            return;
        }
        setIsActionLoading(true);
        setActionResponse("");
        try {
            const res = await fetch('/api/headless-validate-html', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ siteId: selectedSite, html: htmlToValidate }),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.message || "Failed to validate HTML.");
            setActionResponse(JSON.stringify(result, null, 2));
            toast.success("HTML validation complete.");
        } catch (error: any) {
            setActionResponse(error.message);
            toast.error("Failed to validate HTML", { description: error.message });
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleValidateUrl = async () => {
        if (!selectedSite || !urlToValidate) {
            toast.warning("Please select a site and provide a URL.");
            return;
        }
        setIsActionLoading(true);
        setActionResponse("");
        try {
            const res = await fetch('/api/headless-validate-url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ siteId: selectedSite, url: urlToValidate }),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.message || "Failed to validate URL.");
            setActionResponse(JSON.stringify(result, null, 2));
            toast.success("URL validation complete.");
        } catch (error: any) {
            setActionResponse(error.message);
            toast.error("Failed to validate URL", { description: error.message });
        } finally {
            setIsActionLoading(false);
        }
    };


    const getStatusColor = (status: string) => {
        if (status === 'SUCCESS') return 'text-green-400';
        if (status === 'ERROR') return 'text-red-400';
        return 'text-blue-400';
    }

    const getJobStatus = (siteId: string) => {
        const job = importJobs[siteId];
        if (!job || !job.isSubmitting) {
            return null;
        }
        const total = job.recipientEmails.split(/[,\s\n]+/).filter(e => e.includes('@')).length;
        const processed = Math.floor((job.progress / 100) * total);
        const statusText = job.isPaused ? "Paused" : "Processing";
        return `${processed}/${total} ${statusText}`;
    };

    const processedEmails = Math.floor((activeJob.progress / 100) * emailCount);
    let estimatedTime = "Calculating...";
    if (processedEmails > 0 && activeJob.elapsedTime > 1000 && !activeJob.isPaused) {
        const timePerEmail = activeJob.elapsedTime / processedEmails;
        const remainingEmails = emailCount - processedEmails;
        const remainingTime = timePerEmail * remainingEmails;
        estimatedTime = formatTime(remainingTime);
    } else if (!activeJob.isSubmitting) {
        estimatedTime = "00:00";
    }
    const successCount = activeJob.importResults.filter(r => r.status === 'SUCCESS').length;
    const failCount = activeJob.importResults.filter(r => r.status === 'ERROR').length;
    
    const filteredResults = activeJob.importResults.filter(result => {
        if (resultFilter === 'ALL') return true;
        return result.status === resultFilter;
    });

    const handleExport = () => {
        if (filteredResults.length === 0) {
            toast.warning("No emails to export for the current filter.");
            return;
        }
        const emailsToExport = filteredResults.map(result => result.email).join('\n');
        const blob = new Blob([emailsToExport], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        const siteName = sites.find(s => s.siteId === selectedSite)?.siteName || 'export';
        link.href = URL.createObjectURL(blob);
        link.download = `${siteName}_import_${resultFilter.toLowerCase()}_${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(`${filteredResults.length} emails exported successfully.`);
    };

    return (
        <div className="min-h-screen bg-gradient-subtle">
            <Navbar />
            <div className="container mx-auto px-4 pt-24 pb-12">
                <div className="max-w-5xl mx-auto space-y-8">
                    <div className="flex items-center justify-between gap-4 animate-fade-in">
                        <div className="flex items-center gap-4">
                            <UserPlus className="h-10 w-10 text-primary" />
                            <div>
                                <h1 className="text-3xl font-bold">Member & Import Management</h1>
                            </div>
                        </div>
                        <div className="flex gap-2 items-center">
                             <Input
                                placeholder="Search by name or email..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch() }}
                                className="w-48"
                            />
                            <Button onClick={handleSearch} disabled={isSearching || !selectedSite} size="icon">
                                <Search className="h-4 w-4"/>
                            </Button>
                            <Dialog onOpenChange={() => setActionResponse("")}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="icon"><Code className="h-4 w-4" /></Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Validate HTML Links</DialogTitle>
                                        <CardDescription>Check for blacklisted links within HTML content.</CardDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="html-validate">HTML Content</Label>
                                            <Textarea id="html-validate" value={htmlToValidate} onChange={e => setHtmlToValidate(e.target.value)} className="h-32 font-mono text-xs" />
                                        </div>
                                        <Textarea readOnly value={actionResponse} className="h-24 font-mono text-xs bg-muted" placeholder="API response..." />
                                    </div>
                                    <DialogFooter>
                                        <Button onClick={handleValidateHtml} disabled={isActionLoading}>{isActionLoading ? "Validating..." : "Validate"}</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                            <Dialog onOpenChange={() => setActionResponse("")}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="icon"><Link className="h-4 w-4" /></Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Validate Link</DialogTitle>
                                        <CardDescription>Check if a single URL is blacklisted.</CardDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="url-validate">URL to Validate</Label>
                                            <Input id="url-validate" value={urlToValidate} onChange={e => setUrlToValidate(e.target.value)} placeholder="https://www.wix.com" />
                                        </div>
                                        <Textarea readOnly value={actionResponse} className="h-24 font-mono text-xs bg-muted" placeholder="API response..." />
                                    </div>
                                    <DialogFooter>
                                        <Button onClick={handleValidateUrl} disabled={isActionLoading}>{isActionLoading ? "Validating..." : "Validate"}</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <Card className="bg-gradient-card shadow-card border-primary/10 h-full">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Building className="h-5 w-5" />Site Selection</CardTitle>
                                <CardDescription>Choose a site to manage its members or import new ones.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {isLoadingSites ? <p>Loading sites...</p> : (
                                    <Select
                                        value={selectedSite}
                                        onValueChange={(value) => {
                                            setSelectedSite(value);
                                            setSearchResults([]);
                                            setSelectedMembers([]);
                                            fetchSenderDetails(value);
                                        }}
                                        disabled={sites.length === 0}
                                    >
                                        <SelectTrigger>
                                            <SelectValue asChild>
                                                <div className="flex justify-between w-full items-center">
                                                    <span>{sites.find(s => s.siteId === selectedSite)?.siteName || "Select a project..."}</span>
                                                    <span className="text-xs text-muted-foreground mr-2">{getJobStatus(selectedSite)}</span>
                                                </div>
                                            </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {sites.map((site) => (site &&
                                                <SelectItem key={site._id} value={site.siteId}>
                                                    <div className="flex justify-between w-full">
                                                        <span>{site.siteName}</span>
                                                        <span className="text-xs text-muted-foreground ml-4">{getJobStatus(site.siteId)}</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            </CardContent>
                        </Card>
                        <Card className="bg-gradient-card shadow-card border-primary/10 h-full">
                            <CardHeader>
                                <CardTitle>Sender Details</CardTitle>
                                <CardDescription>Manage the sender name for triggered emails.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-2">
                                    <Input
                                        placeholder="Loading..."
                                        value={senderDetails?.fromName || ''}
                                        onChange={(e) => setSenderDetails(prev => prev ? { ...prev, fromName: e.target.value } : null)}
                                        disabled={isFetchingSender || isUpdatingSender}
                                    />
                                    <Button onClick={handleUpdateSenderName} disabled={isUpdatingSender || !senderDetails} size="icon">
                                        <Save className="h-4 w-4" />
                                    </Button>
                                    <Button onClick={() => fetchSenderDetails(selectedSite)} disabled={isFetchingSender} variant="outline" size="icon">
                                        <RefreshCw className={`h-4 w-4 ${isFetchingSender ? 'animate-spin' : ''}`} />
                                    </Button>
                                </div>
                                {senderDetails && <p className="text-xs text-muted-foreground mt-2">Sender Email: {senderDetails.fromEmail}</p>}
                            </CardContent>
                        </Card>
                    </div>

                    {(isSearching || searchResults.length > 0) && (
                        <Card className="bg-gradient-card shadow-card border-primary/10">
                            <CardContent className="p-6 space-y-4">
                                <div className="border rounded-lg overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-[50px]">
                                                    <Checkbox
                                                        checked={searchResults.length > 0 && selectedMembers.length > 0 && selectedMembers.length === searchResults.length}
                                                        onCheckedChange={(checked) => {
                                                            const allMembers = checked
                                                                ? searchResults.map(m => ({ memberId: m.id, contactId: m.contactId }))
                                                                : [];
                                                            setSelectedMembers(allMembers);
                                                        }}
                                                    />
                                                </TableHead>
                                                <TableHead>Name</TableHead>
                                                <TableHead>Email</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {isSearching ? (
                                                <TableRow><TableCell colSpan={3} className="text-center h-24">Searching...</TableCell></TableRow>
                                            ) : (
                                                searchResults.map(member => (
                                                    <TableRow key={member.id}>
                                                        <TableCell>
                                                            <Checkbox
                                                                checked={selectedMembers.some(m => m.memberId === member.id)}
                                                                onCheckedChange={(checked) => {
                                                                    setSelectedMembers(prev =>
                                                                        checked
                                                                            ? [...prev, { memberId: member.id, contactId: member.contactId }]
                                                                            : prev.filter(m => m.memberId !== member.id)
                                                                    );
                                                                }}
                                                            />
                                                        </TableCell>
                                                        <TableCell>{member.profile?.nickname || 'N/A'}</TableCell>
                                                        <TableCell>{member.loginEmail}</TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                            {selectedMembers.length > 0 && (
                                <CardFooter>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" disabled={isDeleting}>
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                {isDeleting ? 'Deleting...' : `Delete (${selectedMembers.length}) Selected`}
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This will permanently delete the selected {selectedMembers.length} member(s) AND their contact records from the site. This action cannot be undone.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={handleDeleteSelected} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Yes, Delete Members</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </CardFooter>
                            )}
                        </Card>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                            <Card className="bg-gradient-card shadow-card border-primary/10 flex flex-col">
                                <CardHeader>
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <CardTitle>Bulk User Import</CardTitle>
                                            <CardDescription>Enter one email address per line to import new users.</CardDescription>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="secondary">{emailCount} email(s)</Badge>
                                            <Button type="button" variant="ghost" size="icon" onClick={() => updateActiveJob({ recipientEmails: "" })} disabled={activeJob.recipientEmails === ""}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-grow">
                                    <Textarea value={activeJob.recipientEmails} onChange={(e) => updateActiveJob({ recipientEmails: e.target.value })} placeholder="user1@example.com user2@example.com" className="h-48 resize font-mono text-sm" />
                                </CardContent>
                                 {(activeJob.isSubmitting || activeJob.jobCompleted) && (
                                    <CardFooter className="p-4">
                                        <div className="w-full p-4 border rounded-lg bg-background/50 flex justify-around items-center">
                                            <div className="text-center">
                                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Time Elapsed</p>
                                                <p className="text-xl font-bold font-mono text-primary">{formatTime(activeJob.elapsedTime)}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Processed</p>
                                                <p className="text-xl font-bold font-mono text-primary">{processedEmails}/{emailCount}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Est. Time Remaining</p>
                                                <p className="text-xl font-bold font-mono text-primary">{estimatedTime}</p>
                                            </div>
                                             <div className="text-center">
                                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Success</p>
                                                <p className="text-xl font-bold font-mono text-green-500">{successCount}</p>
                                            </div>
                                             <div className="text-center">
                                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Fail</p>
                                                <p className="text-xl font-bold font-mono text-red-500">{failCount}</p>
                                            </div>
                                        </div>
                                    </CardFooter>
                                )}
                            </Card>
                            <div className="space-y-8">
                                <Card className="bg-gradient-card shadow-card border-primary/10"><CardHeader><CardTitle>Import Job Settings</CardTitle><CardDescription>Configure the import job behavior.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="space-y-2"><Label htmlFor="delay">Delay Between Requests (seconds)</Label><div className="relative"><Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input id="delay" type="number" value={activeJob.delaySeconds} onChange={(e) => updateActiveJob({ delaySeconds: Number(e.target.value) })} min="0" className="pl-10" /></div></div></CardContent></Card>
                                <Card className="bg-gradient-card shadow-card border-primary/10"><CardHeader><CardTitle>Custom Welcome Email</CardTitle><CardDescription>This will be the subject of your Triggered Email.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="space-y-2"><Label htmlFor="subject">Email Subject</Label><Input id="subject" value={activeJob.customSubject} onChange={(e) => updateActiveJob({ customSubject: e.target.value })} placeholder="Welcome aboard!" /></div></CardContent></Card>
                            </div>
                        </div>
                        
                        <Card className="bg-gradient-primary text-primary-foreground shadow-glow mt-8">
                            <CardContent className="p-6 flex items-center justify-between">
                                <div><h3 className="text-xl font-bold">{activeJob.isSubmitting ? (activeJob.isPaused ? 'Job Paused' : 'Job in Progress...') : 'Ready to Import?'}</h3><p className="text-primary-foreground/80">{activeJob.isSubmitting ? 'You can pause, resume, or end the import job at any time.' : 'Start the import job for the selected site.'}</p></div>
                                {!activeJob.isSubmitting ? (<Button type="submit" disabled={!activeJob.recipientEmails} className="w-48 bg-white text-primary hover:bg-white/90" size="lg"><PlayCircle className="mr-2 h-5 w-5" />Start Import Job</Button>) : (<div className="flex items-center gap-4"><Button type="button" onClick={handlePauseResume} variant="outline" className="w-48 bg-white/20 hover:bg-white/30" size="lg">{activeJob.isPaused ? <PlayCircle className="mr-2 h-5 w-5" /> : <PauseCircle className="mr-2 h-5 w-5" />}{activeJob.isPaused ? 'Resume Job' : 'Pause Job'}</Button><AlertDialog><AlertDialogTrigger asChild><Button type="button" variant="destructive" size="lg"><StopCircle className="mr-2 h-5 w-5" /> End Job</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>End the Import Job?</AlertDialogTitle><AlertDialogDescription>The current import process will be terminated. Any remaining emails will not be processed.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleEndJob} className="bg-destructive hover:bg-destructive/90">Yes, End Job</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div>)}
                            </CardContent>
                        </Card>
                    </form>

                    {activeJob.importResults.length > 0 && (
                        <Card className="bg-gradient-card shadow-card border-primary/10">
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                    <div>
                                        <CardTitle>Import Results</CardTitle>
                                        {activeJob.isSubmitting || activeJob.progress < 100 ? (
                                            <div className="space-y-2 pt-2">
                                                <Progress value={activeJob.progress} className="w-full" />
                                                <p className="text-sm text-muted-foreground">{activeJob.isPaused ? "Job is paused..." : activeJob.countdown > 0 ? `Next import in ${activeJob.countdown}s...` : activeJob.isSubmitting ? `Processing user ${Math.ceil(activeJob.progress / 100 * emailCount)} of ${emailCount}` : "Job finished."}</p>
                                            </div>
                                        ) : (
                                            <CardDescription>The import process has finished.</CardDescription>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <ToggleGroup type="single" value={resultFilter} onValueChange={(value: 'ALL' | 'SUCCESS' | 'ERROR') => value && setResultFilter(value)} size="sm">
                                            <ToggleGroupItem value="ALL">All</ToggleGroupItem>
                                            <ToggleGroupItem value="SUCCESS">Success</ToggleGroupItem>
                                            <ToggleGroupItem value="ERROR">Fail</ToggleGroupItem>
                                        </ToggleGroup>
                                        <Button variant="outline" size="sm" onClick={handleExport} disabled={filteredResults.length === 0}>
                                            <Download className="mr-2 h-4 w-4" /> Export
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader><TableRow><TableHead className="w-[50px]">#</TableHead><TableHead className="w-[120px]">Status</TableHead><TableHead>Email</TableHead><TableHead>Details</TableHead><TableHead className="w-[150px] text-right">Full Response</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {[...filteredResults].reverse().map((result, index) => {
                                            const originalIndex = activeJob.importResults.findIndex(r => r.email === result.email && r.message === result.message);
                                            const itemNumber = activeJob.importResults.length - originalIndex;
                                            return (
                                                <TableRow key={`${result.email}-${index}`}>
                                                    <TableCell>{itemNumber}</TableCell>
                                                    <TableCell>{result.status === 'SUCCESS' ? (<span className="flex items-center gap-2 text-green-400"><CheckCircle className="h-4 w-4" /> Success</span>) : result.status === 'ERROR' ? (<span className="flex items-center gap-2 text-red-400"><XCircle className="h-4 w-4" /> Error</span>) : (<span className="flex items-center gap-2 text-muted-foreground">... {result.message}</span>)}</TableCell>
                                                    <TableCell className="font-mono text-xs">{result.email}</TableCell>
                                                    <TableCell>{result.status !== 'PENDING' ? result.message : ''}</TableCell>
                                                    <TableCell className="text-right">{result.details && result.status !== 'PENDING' && (<Dialog><DialogTrigger asChild><Button variant="outline" size="sm" className="gap-2"><FileJson className="h-4 w-4" /> View Details</Button></DialogTrigger><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Full Response</DialogTitle></DialogHeader><pre className="mt-2 w-full rounded-md bg-slate-900 p-4 overflow-x-auto"><code className="text-white">{JSON.stringify(result.details, null, 2)}</code></pre><DialogClose asChild><Button type="button" className="mt-4">Close</Button></DialogClose></DialogContent></Dialog>)}</TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}

                    <Card className="bg-gradient-card shadow-card border-primary/10">
                        <CardHeader className="flex flex-row items-center justify-between"><div><CardTitle className="flex items-center gap-2"><Terminal className="h-5 w-5" />Backend Activity Log</CardTitle><CardDescription>Recent events from the backend functions.</CardDescription></div><div className="flex items-center gap-2"><AlertDialog><AlertDialogTrigger asChild><Button variant="destructive" size="icon" disabled={isClearingLogs}><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Clear All Logs?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleClearLogs} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{isClearingLogs ? 'Clearing...' : 'Yes, Clear Logs'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog><Button variant="outline" size="icon" onClick={fetchLogs} disabled={isLoadingLogs}><RefreshCw className={`h-4 w-4 ${isLoadingLogs ? 'animate-spin' : ''}`} /></Button></div></CardHeader>
                        <CardContent><div className="bg-gray-900 text-white font-mono text-xs rounded-lg p-4 h-64 overflow-y-auto">{isLoadingLogs ? <p>Loading logs...</p> : (logs.length === 0 ? <p>No log entries yet.</p> : logs.filter(log => log).map(log => (<div key={log._id} className="flex gap-4"><span className="text-gray-500">{new Date(log._createdDate).toLocaleTimeString()}</span><span className={`${getStatusColor(log.status)} w-20`}>[{log.status}]</span><span className="flex-1">{log.message}</span></div>)))}</div></CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default AdminImport;