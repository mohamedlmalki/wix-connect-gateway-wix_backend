// src/App.tsx

import React, { createContext, useState, useContext, useEffect, useRef } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner, toast } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Index from "./pages/Index";
import Contact from "./pages/Contact";
import AdminImport from "./pages/AdminImport";
import SiteManagement from "./pages/SiteManagement";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import BouncedEmails from "./pages/BouncedEmails";
import NotFound from "./pages/NotFound";
import CampaignStatistics from "./pages/CampaignStatistics";
import BulkDelete from "./pages/BulkDelete";

// --- Job Context for background tasks ---

// Types for AdminImport jobs
export interface ImportResult {
  email: string;
  status: 'SUCCESS' | 'ERROR' | 'PENDING';
  message: string;
  details?: any;
}

export interface ImportJobState {
  recipientEmails: string;
  importResults: ImportResult[];
  progress: number;
  countdown: number;
  isSubmitting: boolean;
  isPaused: boolean;
  jobPaused: React.MutableRefObject<boolean>;
  jobCancelled: React.MutableRefObject<boolean>;
  customSubject: string;
  delaySeconds: number;
  jobCompleted: boolean;
  elapsedTime: number;
}

// Types for BulkDelete jobs
export interface Member {
    id: string;
    loginEmail: string;
    status: string;
    profile: {
        nickname: string;
    };
    contactId: string;
}

export interface ContactDeletionResult {
    email: string;
    status: 'SUCCESS' | 'ERROR';
    error?: string;
}

export interface DeletionLog {
    batch: number;
    type: 'Member Deletion' | 'Contact Deletion';
    status: 'SUCCESS' | 'ERROR' | 'MIXED';
    details: string;
    rawError?: any;
    contactResults?: ContactDeletionResult[];
}

export interface BulkDeleteJobState {
    isDeleting: boolean;
    deletionProgress: number;
    deletionStatus: string;
    jobCancelled: React.MutableRefObject<boolean>;
    logs: DeletionLog[];
    jobCompleted?: boolean;
}

// Context shape
interface JobContextType {
  importJobs: Record<string, ImportJobState>;
  setImportJobs: React.Dispatch<React.SetStateAction<Record<string, ImportJobState>>>;
  bulkDeleteJobs: Record<string, BulkDeleteJobState>;
  setBulkDeleteJobs: React.Dispatch<React.SetStateAction<Record<string, BulkDeleteJobState>>>;
  startBulkDeleteJob: (siteId: string, members: Member[], ownerContactId: string | null) => void;
}

const JobContext = createContext<JobContextType | undefined>(undefined);

export const useJobs = () => {
  const context = useContext(JobContext);
  if (context === undefined) {
    throw new Error('useJobs must be used within a JobProvider');
  }
  return context;
};

const JobProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [importJobs, setImportJobs] = useState<Record<string, ImportJobState>>({});
  const [bulkDeleteJobs, setBulkDeleteJobs] = useState<Record<string, BulkDeleteJobState>>({});
  const timersRef = useRef<Record<string, NodeJS.Timeout>>({});
  const startTimesRef = useRef<Record<string, number>>({});

  useEffect(() => {
    Object.entries(importJobs).forEach(([siteId, job]) => {
      const timerExists = !!timersRef.current[siteId];

      if (job.isSubmitting && !job.isPaused) {
        if (!timerExists) {
          startTimesRef.current[siteId] = Date.now() - job.elapsedTime;
          timersRef.current[siteId] = setInterval(() => {
            setImportJobs(prevJobs => {
              const currentJob = prevJobs[siteId];
              if (currentJob && currentJob.isSubmitting && !currentJob.isPaused) {
                return {
                  ...prevJobs,
                  [siteId]: {
                    ...currentJob,
                    elapsedTime: Date.now() - (startTimesRef.current[siteId] || Date.now()),
                  },
                };
              }
              return prevJobs;
            });
          }, 1000);
        }
      } else {
        if (timerExists) {
          clearInterval(timersRef.current[siteId]);
          delete timersRef.current[siteId];
          delete startTimesRef.current[siteId];
        }
      }
    });
  }, [importJobs, setImportJobs]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      Object.values(timers).forEach(clearInterval);
    };
  }, []);

  const startBulkDeleteJob = async (siteId: string, members: Member[], ownerContactId: string | null) => {
      const jobCancelledRef = { current: false };
      const BATCH_SIZE = 50;
      const DELAY_AFTER_MEMBER_DELETION_BATCH = 5000;
      const DELAY_BETWEEN_CONTACT_DELETIONS = 200;

      const updateJobState = (newState: Partial<BulkDeleteJobState>) => {
           setBulkDeleteJobs(prev => ({
              ...prev,
              [siteId]: { ...(prev[siteId] || {} as BulkDeleteJobState), ...newState }
          }));
      }

      const addLogEntry = (logEntry: DeletionLog) => {
          setBulkDeleteJobs(prevJobs => {
              const currentLogs = prevJobs[siteId]?.logs || [];
              return {
                  ...prevJobs,
                  [siteId]: {
                      ...(prevJobs[siteId] || {} as BulkDeleteJobState),
                      logs: [...currentLogs, logEntry],
                  },
              };
          });
      };

      updateJobState({
          isDeleting: true,
          deletionProgress: 0,
          deletionStatus: "Starting deletion...",
          logs: [],
          jobCancelled: jobCancelledRef,
          jobCompleted: false,
      });

      const membersToDelete = members.filter(m => m.contactId !== ownerContactId);
      const totalToDelete = membersToDelete.length;
      let totalSuccessfullyDeleted = 0;

      const memberChunks = [];
      for (let i = 0; i < membersToDelete.length; i += BATCH_SIZE) {
          memberChunks.push(membersToDelete.slice(i, i + BATCH_SIZE));
      }
  
      toast.info(`Starting deletion of ${totalToDelete} members in ${memberChunks.length} batch(es)...`);

      for (let i = 0; i < memberChunks.length; i++) {
          if (jobCancelledRef.current) {
              break;
          }
          const chunk = memberChunks[i];
          const memberIds = chunk.map(m => m.id);
          const batchNum = i + 1;
          updateJobState({ deletionStatus: `Batch ${batchNum}/${memberChunks.length}: Deleting members...`});
          
          try {
              const memberRes = await fetch('/api/headless-bulk-delete-members', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ siteId: siteId, memberIds }),
              });
              const memberData = await memberRes.json();
              
              if (!memberRes.ok) {
                  throw new Error(memberData.message || `Failed to delete members in batch ${batchNum}.`);
              }
  
              const successfulDeletesInBatch = memberData.results.filter((r: any) => r.itemMetadata.success).map((r: any) => r.itemMetadata.id);
              const originalMembersInBatch = chunk.filter(m => successfulDeletesInBatch.includes(m.id));
              
              const successMsg = `${memberData.bulkActionMetadata.totalSuccesses} of ${memberIds.length} members deleted.`;
              addLogEntry({ batch: batchNum, type: 'Member Deletion', status: 'SUCCESS', details: successMsg });
              toast.success(`Member Batch ${batchNum}: ${successMsg}`);
              
              if (originalMembersInBatch.length > 0) {
                  updateJobState({ deletionStatus: `Batch ${batchNum}/${memberChunks.length}: Waiting for Wix to sync...`});
                  await new Promise(resolve => setTimeout(resolve, DELAY_AFTER_MEMBER_DELETION_BATCH));

                  const contactResults: ContactDeletionResult[] = [];
                  for (const member of originalMembersInBatch) {
                      if (jobCancelledRef.current) break;
                      updateJobState({ deletionStatus: `Batch ${batchNum}/${memberChunks.length}: Deleting contact for ${member.loginEmail}`});
                      try {
                          const contactRes = await fetch('/api/headless-delete-contact', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ siteId: siteId, contactId: member.contactId }),
                          });
                          const contactData = await contactRes.json();
                          if (!contactRes.ok) throw new Error(contactData.message || `Failed to delete contact`);
                          contactResults.push({ email: member.loginEmail, status: 'SUCCESS' });
                      } catch (contactError: any) {
                           contactResults.push({ email: member.loginEmail, status: 'ERROR', error: contactError.message });
                      }
                       await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_CONTACT_DELETIONS));
                  }
                  totalSuccessfullyDeleted += originalMembersInBatch.length;

                  const successfulContacts = contactResults.filter(r => r.status === 'SUCCESS').length;
                  const failedContacts = contactResults.length - successfulContacts;
                  const batchStatus = failedContacts === 0 ? 'SUCCESS' : successfulContacts === 0 ? 'ERROR' : 'MIXED';
                  addLogEntry({
                      batch: batchNum,
                      type: 'Contact Deletion',
                      status: batchStatus,
                      details: `${successfulContacts} successful, ${failedContacts} failed.`,
                      contactResults: contactResults
                  });
              }
          } catch (error: any) {
              toast.error(`Error in Batch ${batchNum}`, { description: error.message });
               addLogEntry({ batch: batchNum, type: 'Member Deletion', status: 'ERROR', details: `Batch failed.`, rawError: error.message });
          }
          updateJobState({ deletionProgress: ((i + 1) / memberChunks.length) * 100 });
      }
  
      if (jobCancelledRef.current) {
          toast.error("Deletion job cancelled by user.");
          updateJobState({ isDeleting: false, deletionStatus: 'Job cancelled by user.' });
      } else {
          toast.success("Bulk deletion process finished.", { description: `${totalSuccessfullyDeleted} out of ${totalToDelete} selected members were processed.` });
          updateJobState({ isDeleting: false, deletionStatus: 'Deletion complete.', jobCompleted: true });
      }
  }

  const value = { importJobs, setImportJobs, bulkDeleteJobs, setBulkDeleteJobs, startBulkDeleteJob };

  return (
    <JobContext.Provider value={value}>
      {children}
    </JobContext.Provider>
  );
};

// --- End of Job Context ---

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <JobProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/import" element={<AdminImport />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/bounced-emails" element={<BouncedEmails />} />
            <Route path="/manage-sites" element={<SiteManagement />} />
            <Route path="/campaign-stats" element={<CampaignStatistics />} />
            <Route path="/bulk-delete" element={<BulkDelete />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </JobProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
