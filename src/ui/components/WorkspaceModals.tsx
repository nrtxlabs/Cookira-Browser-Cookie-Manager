import React from 'react';
import type {
  CookieRecord,
  CookieStoreInfo,
  CookiraSettings,
  SessionProfile,
  UndoSnapshot,
} from '../../core/types';
import { ExportImportModal } from './ExportImportModal';
import { ProfilesModal } from './ProfilesModal';
import { SettingsModal } from './SettingsModal';
import { ConfirmDialog } from './ConfirmDialog';

export interface ConfirmState {
  title: string;
  message: string;
  confirmLabel: string;
  action: () => Promise<void>;
}

interface WorkspaceModalsProps {
  exportImportModal: 'export' | 'import' | null;
  profilesOpen: boolean;
  settingsOpen: boolean;
  confirmState: ConfirmState | null;
  settings: CookiraSettings;
  resolvedTheme: 'dark' | 'light';
  activeHost: string | null;
  includeSubdomains: boolean;
  currentDomainLocked: boolean;
  scopedCookies: CookieRecord[];
  filteredCookies: CookieRecord[];
  selectedCookies: CookieRecord[];
  allCookies: CookieRecord[];
  stores: CookieStoreInfo[];
  profiles: SessionProfile[];
  onCloseExportImport: () => void;
  onCloseProfiles: () => void;
  onCloseSettings: () => void;
  onCancelConfirm: () => void;
  onImported: (snapshot: UndoSnapshot, count: number) => Promise<void>;
  onSaveProfile: (name: string) => Promise<void>;
  onSwitchProfile: (profile: SessionProfile) => Promise<void>;
  onRenameProfile: (id: string, nextName: string) => Promise<void>;
  onDeleteProfile: (id: string) => Promise<void>;
  onMergeImportedProfiles: (profiles: SessionProfile[]) => Promise<number>;
  onSaveSettings: (next: CookiraSettings) => Promise<void>;
  onNotify: (msg: string) => void;
}

export const WorkspaceModals: React.FC<WorkspaceModalsProps> = ({
  exportImportModal,
  profilesOpen,
  settingsOpen,
  confirmState,
  settings,
  resolvedTheme,
  activeHost,
  includeSubdomains,
  currentDomainLocked,
  scopedCookies,
  filteredCookies,
  selectedCookies,
  allCookies,
  stores,
  profiles,
  onCloseExportImport,
  onCloseProfiles,
  onCloseSettings,
  onCancelConfirm,
  onImported,
  onSaveProfile,
  onSwitchProfile,
  onRenameProfile,
  onDeleteProfile,
  onMergeImportedProfiles,
  onSaveSettings,
  onNotify,
}) => {
  return (
    <>
      {exportImportModal && (
        <ExportImportModal
          initialTab={exportImportModal}
          defaultExportFormat={settings.defaultExportFormat}
          activeHost={activeHost}
          scopedCookies={scopedCookies}
          filteredCookies={filteredCookies}
          selectedCookies={selectedCookies}
          allCookies={allCookies}
          onImported={onImported}
          onNotify={onNotify}
          onClose={onCloseExportImport}
        />
      )}

      {profilesOpen && (
        <ProfilesModal
          profiles={profiles}
          activeHost={activeHost}
          includeSubdomains={includeSubdomains}
          scopedCookies={scopedCookies}
          isLocked={currentDomainLocked}
          onSaveProfile={onSaveProfile}
          onSwitchProfile={onSwitchProfile}
          onRenameProfile={onRenameProfile}
          onDeleteProfile={onDeleteProfile}
          onMergeImportedProfiles={onMergeImportedProfiles}
          onNotify={onNotify}
          onClose={onCloseProfiles}
        />
      )}

      {settingsOpen && (
        <SettingsModal
          settings={settings}
          resolvedTheme={resolvedTheme}
          profileCount={profiles.length}
          stores={stores}
          allCookies={allCookies}
          onSaveSettings={onSaveSettings}
          onNotify={onNotify}
          onClose={onCloseSettings}
        />
      )}

      {confirmState && (
        <ConfirmDialog
          title={confirmState.title}
          message={confirmState.message}
          confirmLabel={confirmState.confirmLabel}
          onConfirm={() => void confirmState.action()}
          onCancel={onCancelConfirm}
        />
      )}
    </>
  );
};
