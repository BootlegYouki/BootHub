import { useState, useEffect, useRef } from 'react';
import { Keyboard, Alert } from 'react-native';
import { updateItem, addItem, deleteItem, DumpItem, DumpType } from '../utils/storage';
import { getFolderName } from './use-tab-filter';

interface UseEditItemOptions {
  items: DumpItem[];
  setItems: React.Dispatch<React.SetStateAction<DumpItem[]>>;
  activeTab: DumpType;
  getActiveExpandedFolder: () => { id: string; name: string } | null;
  scrollToTab: (tab: DumpType, animated?: boolean) => void;
}

export interface UseEditItemReturn {
  editingItemId: string | null;
  setEditingItemId: (id: string | null) => void;
  editText: string;
  setEditText: (text: string) => void;
  editLabelText: string;
  setEditLabelText: (text: string) => void;
  editStep: 'value' | 'label';
  setEditStep: (step: 'value' | 'label') => void;
  editInputRef: React.RefObject<any>;
  handleEditItem: (item: DumpItem) => void;
  handleSaveEdit: (id: string, value: string, label?: string) => Promise<void>;
  handleCancelEdit: () => void;
  handleCreateFolder: () => void;
}

export function useEditItem({
  items,
  setItems,
  activeTab,
  getActiveExpandedFolder,
  scrollToTab,
}: UseEditItemOptions): UseEditItemReturn {
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editLabelText, setEditLabelText] = useState('');
  const [editStep, setEditStep] = useState<'value' | 'label'>('value');
  const editInputRef = useRef<any>(null);

  // Auto-focus the edit input when editing starts or step changes
  useEffect(() => {
    if (editingItemId !== null) {
      const timer = setTimeout(() => {
        editInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    } else {
      Keyboard.dismiss();
    }
  }, [editingItemId, editStep]);

  const handleEditItem = (item: DumpItem) => {
    setEditingItemId(item.id);
    setEditStep('value');
    setEditLabelText(item.label || '');
    if (item.type === 'file') {
      try {
        const fileObj = JSON.parse(item.value);
        setEditText(fileObj.name || 'File');
      } catch {
        setEditText(item.value);
      }
    } else if (item.type === 'folder') {
      try {
        const folderObj = JSON.parse(item.value);
        setEditText(folderObj.name || 'New Folder');
      } catch {
        setEditText(item.value);
      }
    } else {
      setEditText(item.value);
    }
  };

  const handleSaveEdit = async (id: string, value: string, label?: string) => {
    Keyboard.dismiss();
    let finalValue = value.trim();
    let finalLabel = label !== undefined ? label.trim() : editLabelText.trim();

    if (id === 'temp-new-folder') {
      if (!finalValue) finalValue = 'New Folder';

      const parentFolderId = getActiveExpandedFolder()?.id;
      const siblingNames = items
        .filter((x) => x.type === 'folder' && x.folderId === parentFolderId)
        .map((x) => { try { return JSON.parse(x.value).name as string; } catch {} return null; })
        .filter((n): n is string => n !== null);

      if (siblingNames.includes(finalValue)) {
        let counter = 1;
        while (siblingNames.includes(`${finalValue}_${counter}`)) counter++;
        finalValue = `${finalValue}_${counter}`;
      }

      try {
        const folderVal = JSON.stringify({ name: finalValue, tab: activeTab });
        const folder = getActiveExpandedFolder();
        const updatedList = await addItem('folder', folderVal, folder?.id);
        setItems(updatedList);
      } catch (e) {
        console.error('Failed to create folder:', e);
      } finally {
        setEditingItemId(null);
        setEditStep('value');
      }
      return;
    }

    const item = items.find((x) => x.id === id);
    if (!item) return;

    if (item.type === 'folder') {
      if (!finalValue) finalValue = 'New Folder';

      const siblingNames = items
        .filter((x) => x.type === 'folder' && x.id !== id && x.folderId === item.folderId)
        .map((x) => { try { return JSON.parse(x.value).name as string; } catch {} return null; })
        .filter((n): n is string => n !== null);

      if (siblingNames.includes(finalValue)) {
        let counter = 1;
        while (siblingNames.includes(`${finalValue}_${counter}`)) counter++;
        finalValue = `${finalValue}_${counter}`;
      }
    } else {
      if (!finalValue && !finalLabel) return;
    }

    try {
      const updated = await updateItem(id, finalValue || item.value, finalLabel || item.label);
      setItems(updated);
    } catch (e) {
      console.error('Failed to save edit:', e);
    } finally {
      setEditingItemId(null);
      setEditStep('value');
    }
  };

  const handleCancelEdit = () => {
    Keyboard.dismiss();
    setEditingItemId(null);
    setEditStep('value');
  };

  const handleCreateFolder = () => {
    setEditingItemId('temp-new-folder');
    setEditText('');
    setEditStep('value');
  };

  return {
    editingItemId,
    setEditingItemId,
    editText,
    setEditText,
    editLabelText,
    setEditLabelText,
    editStep,
    setEditStep,
    editInputRef,
    handleEditItem,
    handleSaveEdit,
    handleCancelEdit,
    handleCreateFolder,
  };
}
