import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Edit2,
  Trash2,
  Plus,
  Eye,
  Paperclip,
  Upload
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { Record as TmsRecord } from '../utils/types';
import { apiFetch } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useRolePath } from '../utils/rolePath';
import { can } from '../utils/permissions';

export function RecordsPage() {
  const navigate = useNavigate();
  const { path } = useRolePath();
  const { user } = useAuth();

  const [records, setRecords] = useState<TmsRecord[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  // Excel Import
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewResult, setPreviewResult] = useState<any | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const canAdd = can('add', user?.role);
  const canEdit = can('edit', user?.role);
  const canDelete = can('delete', user?.role);

  // ---------------------------------------------------------
  // Load / Reload Records
  // ---------------------------------------------------------

  const reloadRecords = async () => {
    const res = await apiFetch('/api/records');

    if (!res.ok) {
      throw new Error('Failed to refresh records');
    }

    const data = await res.json();

    const mapped = Array.isArray(data)
      ? data.map((r: any) => ({
          ...r,
          id: r._id || r.id
        }))
      : [];

    setRecords(mapped);
  };

  // ---------------------------------------------------------
  // Excel Import
  // ---------------------------------------------------------

  const handleExcelPreview = async () => {
    if (!importFile || !canAdd) return;

    setIsPreviewing(true);
    setPreviewResult(null);
    setPreviewError(null);
    setImportResult(null);
    setImportError(null);

    try {
      const formData = new FormData();
      formData.append('file', importFile);

      const res = await apiFetch('/api/records/preview-excel', {
        method: 'POST',
        body: formData
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          data.message || 'Failed to preview Excel file'
        );
      }

      setPreviewResult(data);
    } catch (err: any) {
      console.error('Excel preview failed:', err);

      setPreviewError(
        err.message || 'Failed to preview Excel file'
      );
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleExcelImport = async () => {
    if (!importFile || !canAdd) return;

    setIsImporting(true);
    setImportResult(null);
    setImportError(null);

    try {
      const formData = new FormData();

      // Must match:
      // excelUpload.single('file')
      formData.append('file', importFile);

      const res = await apiFetch('/api/records/import-excel', {
        method: 'POST',
        body: formData
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          data.message || 'Failed to import Excel file'
        );
      }

      if (data.created !== undefined) {
        setImportResult(
          `Import completed: ${data.created} created, ${
            data.updated || 0
          } updated, ${data.skipped || 0} skipped.`
        );
      } else {
        setImportResult(
          data.message || 'Excel file imported successfully.'
        );
      }

      // Refresh table after successful import
      await reloadRecords();
    } catch (err: any) {
      console.error('Excel import failed:', err);

      setImportError(
        err.message || 'Failed to import Excel file'
      );
    } finally {
      setIsImporting(false);
    }
  };

  // ---------------------------------------------------------
  // Delete Record
  // ---------------------------------------------------------

  const handleDelete = () => {
    (async () => {
      if (!deleteId || !canDelete) return;

      try {
        const res = await apiFetch(`/api/records/${deleteId}`, {
          method: 'DELETE'
        });

        if (res.ok) {
          setRecords(prev =>
            prev.filter(r => r.id !== deleteId)
          );
        } else {
          const err = await res
            .json()
            .catch(() => ({
              message: 'Failed to delete'
            }));

          alert(
            err.message ||
              'Error: Failed to delete record.'
          );
        }
      } catch (err) {
        console.error(err);

        alert('Error: Failed to delete record.');
      } finally {
        setDeleteId(null);
      }
    })();
  };

  // ---------------------------------------------------------
  // Initial Data Load
  // ---------------------------------------------------------

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const res = await apiFetch('/api/records');

        if (!res.ok) {
          throw new Error(
            'Failed to fetch records from server'
          );
        }

        const data = await res.json();

        const mapped = Array.isArray(data)
          ? data.map((r: any) => ({
              ...r,
              id: r._id || r.id
            }))
          : [];

        setRecords(mapped);
      } catch (err: any) {
        console.error('Failed to load records', err);

        setError(
          err.message || 'Failed to load tender records'
        );
      } finally {
        setIsLoading(false);
      }

      // Load Categories
      try {
        const res = await apiFetch('/api/categories');

        if (res.ok) {
          const catData = await res.json();

          setCategories(
            Array.isArray(catData) ? catData : []
          );
        }
      } catch (err) {
        console.error(
          'Failed to load categories',
          err
        );
      }
    };

    loadData();
  }, []);

  // ---------------------------------------------------------
  // Filters
  // ---------------------------------------------------------

  const filteredRecords = records.filter(record => {
    const statusMatch =
      statusFilter === 'All' ||
      record.status === statusFilter;

    // Resolving standard vs plural category naming variations
    // e.g. Material vs Materials
    const recCat = (
      record.category || ''
    ).toLowerCase();

    const filtCat =
      categoryFilter.toLowerCase();

    const categoryMatch =
      categoryFilter === 'All' ||
      recCat.includes(filtCat) ||
      filtCat.includes(recCat);

    const tenderNumber =
      record.tenderNumber || '';

    const searchMatch = tenderNumber
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    return (
      statusMatch &&
      categoryMatch &&
      searchMatch
    );
  });

  // ---------------------------------------------------------
  // Status Colour
  // ---------------------------------------------------------

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Under Evaluation':
        'bg-amber-100 text-amber-800',

      'Doc Review':
        'bg-blue-100 text-blue-800',

      'Negotiate or Clarification':
        'bg-purple-100 text-purple-800',

      'Re-evaluation':
        'bg-orange-100 text-orange-800',

      Reject:
        'bg-red-100 text-red-800',

      Awarded:
        'bg-green-100 text-green-800',

      Cancel:
        'bg-gray-100 text-gray-800',

      Close:
        'bg-slate-100 text-slate-800',

      Retender:
        'bg-yellow-100 text-yellow-800',

      'In PPC':
        'bg-indigo-100 text-indigo-800'
    };

    return (
      colors[status] ||
      'bg-gray-100 text-gray-800'
    );
  };

  // ---------------------------------------------------------
  // Date Formatting
  // ---------------------------------------------------------

  const formatDate = (
    dateStr: string | undefined
  ) => {
    if (!dateStr) return '-';

    try {
      return new Date(dateStr)
        .toISOString()
        .split('T')[0];
    } catch (e) {
      return typeof dateStr === 'string'
        ? dateStr.slice(0, 10)
        : '-';
    }
  };

  // ---------------------------------------------------------
  // Category Options
  // ---------------------------------------------------------

 const categoryOptions = [
  { value: 'All', label: 'All Categories' },
  { value: 'Renting Building', label: 'Renting Building' },
  { value: 'Other', label: 'Other' },
  { value: 'Hiring Vehicle', label: 'Hiring Vehicle' },
  { value: 'Janitorial', label: 'Janitorial' },
  { value: 'Materials', label: 'Materials' },
  { value: 'Civil', label: 'Civil' },
  { value: 'Security', label: 'Security' }
];

  // ---------------------------------------------------------
  // UI
  // ---------------------------------------------------------

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col gap-6">

      {/* Header */}

      <div className="flex-shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">

        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Records Management
          </h2>

          <p className="text-slate-500">
            Manage and track all tender records
          </p>
        </div>

        {canAdd && (
          <div className="flex items-center gap-2">

            {/* Import Excel Button */}

            <Button
              variant="outline"
              onClick={() => {
                setImportFile(null);
                setImportResult(null);
                setImportError(null);
                setIsImportOpen(true);
              }}
              leftIcon={
                <Upload className="w-4 h-4" />
              }
            >
              Import Excel
            </Button>

            {/* Add Record Button */}

            <Button
              onClick={() =>
                navigate(path('/records/add'))
              }
              leftIcon={
                <Plus className="w-4 h-4" />
              }
            >
              Add New Record
            </Button>

          </div>
        )}
      </div>

      {/* Filters Section */}

      <div className="flex-shrink-0 bg-white rounded-lg shadow-sm border border-slate-200 p-4">

        <div className="flex flex-col sm:flex-row gap-4">

          <div className="flex-1 min-w-[300px]">

            <input
              type="text"
              placeholder="Search by Tender Number..."
              className="w-full h-10 rounded-md border border-slate-300 px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
              value={searchTerm}
              onChange={e =>
                setSearchTerm(e.target.value)
              }
            />

          </div>

          <Select
            className="w-full sm:w-48"
            options={[
              {
                value: 'All',
                label: 'All Status'
              },
              {
                value: 'Awarded',
                label: 'Awarded'
              },
              {
                value: 'Cancel',
                label: 'Cancel'
              },
              {
                value: 'Close',
                label: 'Close'
              },
              {
                value: 'Doc Review',
                label: 'Doc Review'
              },
              {
                value:
                  'Negotiate or Clarification',
                label:
                  'Negotiate or Clarification'
              },
              {
                value: 'Re-evaluation',
                label: 'Re-evaluation'
              },
              {
                value: 'Reject',
                label: 'Reject'
              },
              {
                value: 'Retender',
                label: 'Retender'
              },
              {
                value: 'Under Evaluation',
                label: 'Under Evaluation'
              }
            ]}
            value={statusFilter}
            onChange={e =>
              setStatusFilter(e.target.value)
            }
          />

          <Select
            className="w-full sm:w-48"
            options={categoryOptions}
            value={categoryFilter}
            onChange={e =>
              setCategoryFilter(e.target.value)
            }
          />

        </div>
      </div>

      {/* Main Data Table */}

      <div className="flex-1 min-h-0 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 overflow-hidden ring-1 ring-slate-200 flex flex-col">

        <div className="flex-1 overflow-auto custom-scrollbar">

          <table className="w-full text-sm text-left min-w-[1800px]">

            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200 sticky top-0 z-20">

              <tr>

                <th className="px-4 py-3 font-medium whitespace-nowrap">
                  Tender No
                </th>

                <th className="px-4 py-3 font-medium whitespace-nowrap">
                  Unit
                </th>

                <th className="px-4 py-3 font-medium whitespace-nowrap">
                  Category
                </th>

                <th className="px-4 py-3 font-medium whitespace-nowrap">
                  Description
                </th>

                <th className="px-4 py-3 font-medium whitespace-nowrap">
                  Result/Bid Start
                </th>

                <th className="px-4 py-3 font-medium whitespace-nowrap">
                  Bid Open
                </th>

                <th className="px-4 py-3 font-medium whitespace-nowrap">
                  Bid Close
                </th>

                <th className="px-4 py-3 font-medium whitespace-nowrap">
                  File Sent TEC
                </th>

                <th className="px-4 py-3 font-medium whitespace-nowrap">
                  Bond Number
                </th>

                <th className="px-4 py-3 font-medium whitespace-nowrap">
                  Bank/PIV
                </th>

                <th className="px-4 py-3 font-medium whitespace-nowrap">
                  Status
                </th>

                <th className="px-4 py-3 font-medium whitespace-nowrap">
                  TEC Chairman
                </th>

                <th className="px-4 py-3 font-medium whitespace-nowrap">
                  Awarded To
                </th>

                <th className="px-4 py-3 font-medium whitespace-nowrap">
                  Delay
                </th>

                <th className="px-4 py-3 font-medium whitespace-nowrap sticky right-0 bg-slate-50 z-20 shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.1)]">
                  Actions
                </th>

              </tr>
            </thead>

            <tbody>

              {isLoading ? (

                <tr>
                  <td
                    colSpan={15}
                    className="px-6 py-8 text-center text-slate-500"
                  >

                    <div className="flex items-center justify-center gap-2">

                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />

                      <span>
                        Loading records...
                      </span>

                    </div>

                  </td>
                </tr>

              ) : error ? (

                <tr>
                  <td
                    colSpan={15}
                    className="px-6 py-8 text-center text-red-600 bg-red-50/50 font-medium"
                  >
                    {error}
                  </td>
                </tr>

              ) : filteredRecords.length > 0 ? (

                filteredRecords.map(
                  (record, idx) => (

                    <tr
                      key={record.id}
                      className={`border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors ${
                        idx % 2 === 0
                          ? 'bg-white'
                          : 'bg-slate-50/50'
                      }`}
                    >

                      <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                        {record.tenderNumber}
                      </td>

                      <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                        {record.relevantTo}
                      </td>

                      <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                        {record.category}
                      </td>

                      <td className="px-4 py-3 text-slate-700">

                        <span
                          className="block max-w-xs truncate"
                          title={record.description}
                        >
                          {record.description}
                        </span>

                      </td>

                      <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                        {formatDate(
                          record.bidStartDate
                        )}
                      </td>

                      <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                        {formatDate(
                          record.bidOpenDate
                        )}
                      </td>

                      <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                        {formatDate(
                          record.bidClosingDate
                        )}
                      </td>

                      <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                        {formatDate(
                          record.fileSentToTecDate
                        )}
                      </td>

                      <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                        {record.bidBondNumber ||
                          '-'}
                      </td>

                      <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                        {record.bidBondBank || '-'}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">

                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            record.status
                          )}`}
                        >
                          {record.status}
                        </span>

                      </td>

                      <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                        {record.tecChairman}
                      </td>

                      <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                        {record.awardedTo || '-'}
                      </td>

                      <td className="px-4 py-3 text-slate-700 whitespace-nowrap">

                        {record.delay !== undefined
                          ? `${record.delay} days`
                          : '-'}

                      </td>

                      <td className="px-4 py-3 whitespace-nowrap sticky right-0 z-10 bg-white shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.1)] transition-colors">

                        <div className="flex items-center gap-2">

                          <button
                            onClick={() =>
                              navigate(
                                path(
                                  `/records/view/${record.id}`
                                )
                              )
                            }
                            className="p-1 text-slate-400 hover:text-[#bd5d2a] transition-colors"
                            title="View Record"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() =>
                              navigate(
                                path(
                                  `/records/view/${record.id}`
                                )
                              )
                            }
                            className="p-1 text-slate-400 hover:text-[#bd5d2a] transition-colors relative"
                            title={`Documents (${
                              (
                                record.documents ||
                                []
                              ).length
                            })`}
                          >

                            <Paperclip className="w-4 h-4" />

                            {record.documents &&
                              record.documents
                                .length > 0 && (

                                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#bd5d2a] text-white text-[9px] font-black rounded-full flex items-center justify-center">

                                  {
                                    record
                                      .documents
                                      .length
                                  }

                                </span>

                              )}

                          </button>

                          {canEdit && (

                            <button
                              onClick={() =>
                                navigate(
                                  path(
                                    `/records/edit/${record.id}`
                                  )
                                )
                              }
                              className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                              title="Edit"
                            >

                              <Edit2 className="w-4 h-4" />

                            </button>

                          )}

                          {canDelete && (

                            <button
                              onClick={() =>
                                setDeleteId(
                                  record.id
                                )
                              }
                              className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                              title="Delete"
                            >

                              <Trash2 className="w-4 h-4" />

                            </button>

                          )}

                        </div>

                      </td>

                    </tr>

                  )
                )

              ) : (

                <tr>

                  <td
                    colSpan={15}
                    className="px-6 py-8 text-center text-slate-500"
                  >
                    No records found.
                  </td>

                </tr>

              )}

            </tbody>

          </table>

        </div>

      </div>

      {/* Excel Import Modal */}

      <Modal
        isOpen={isImportOpen}
        onClose={() => {
          if (!isImporting && !isPreviewing) {
            setIsImportOpen(false);
            setPreviewResult(null);
            setPreviewError(null);
          }
        }}
        title="Import Tender Records from Excel"
        footer={
          <>

            <Button
              variant="ghost"
              onClick={() => {
                setIsImportOpen(false);
                setPreviewResult(null);
                setPreviewError(null);
              }}
              disabled={isImporting || isPreviewing}
            >
              Close
            </Button>

            <Button
              variant="ghost"
              onClick={handleExcelPreview}
              disabled={
                !importFile || isPreviewing || isImporting
              }
            >
              {isPreviewing
                ? 'Previewing...'
                : 'Preview Excel'}
            </Button>

            <Button
              onClick={handleExcelImport}
              disabled={
                !importFile ||
                !previewResult ||
                (previewResult.blockingErrorCount ?? 0) > 0 ||
                isImporting ||
                isPreviewing
              }
              leftIcon={
                <Upload className="w-4 h-4" />
              }
            >
              {isImporting
                ? 'Importing...'
                : 'Import Excel'}
            </Button>

          </>
        }
      >

        <div className="space-y-4">

          <p className="text-sm text-slate-600">
            Select the CEB tender Excel
            workbook. Records will be imported
            from the Pending TEC sheet.
          </p>

          <input
            type="file"
            accept=".xlsx,.xls"
            disabled={isImporting || isPreviewing}
            onChange={e => {
              setImportFile(
                e.target.files?.[0] || null
              );

              setImportResult(null);
              setImportError(null);
              setPreviewResult(null);
              setPreviewError(null);
            }}
            className="block w-full text-sm text-slate-700 file:mr-4 file:rounded-md file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
          />

          {importFile && (

            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">

              Selected:{' '}

              <span className="font-medium text-slate-900">
                {importFile.name}
              </span>

            </div>

          )}

          {isPreviewing && (
            <div className="flex items-center gap-2 text-sm text-blue-700">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span>Checking Excel workbook...</span>
            </div>
          )}

          {previewResult && (
            <div
              className={`rounded-md border px-3 py-3 text-sm ${
                (previewResult.blockingErrorCount ?? 0) > 0
                  ? 'border-red-200 bg-red-50 text-red-800'
                  : 'border-green-200 bg-green-50 text-green-800'
              }`}
            >
              <p className="font-semibold">
                {(previewResult.blockingErrorCount ?? 0) > 0
                  ? 'Validation found blocking problems — import is disabled.'
                  : 'Preview successful — safe rows can be imported.'}
              </p>

              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                <p>Sheet: {previewResult.sheet}</p>

                <p>
                  Header row: {previewResult.headerRow}
                </p>

                <p>
                  Non-blank rows: {previewResult.nonBlankRows}
                </p>

                <p>
                  Valid tender rows:{' '}
                  {previewResult.validTenderRows ?? '-'}
                </p>

                <p>
                  Unique tender numbers:{' '}
                  {previewResult.uniqueTenderNumbers ?? '-'}
                </p>

                <p>
                  Duplicate tender numbers:{' '}
                  {previewResult.duplicateTenderNumbers ?? 0}
                </p>

                <p>
                  Warnings:{' '}
                  {previewResult.warningCount ??
                    previewResult.validationErrorCount ??
                    0}
                </p>

                <p
                  className={
                    (previewResult.blockingErrorCount ?? 0) > 0
                      ? 'font-semibold'
                      : ''
                  }
                >
                  Blocking errors:{' '}
                  {previewResult.blockingErrorCount ?? 0}
                </p>
              </div>

              {(previewResult.errors?.length ?? 0) > 0 && (
                <div className="mt-3 rounded-md border border-red-200 bg-white/70 p-2">

                  <p className="font-semibold mb-1">
                    First warnings / validation issues:
                  </p>

                  <div className="max-h-40 overflow-auto space-y-1 text-xs">

                    {previewResult.errors.map(
                      (item: any, index: number) => (

                        <p
                          key={`${item.row}-${item.field || 'error'}-${index}`}
                        >
                          Row {item.row}
                          {item.field
                            ? ` — ${item.field}`
                            : ''}
                          : {item.message}
                        </p>

                      )
                    )}

                  </div>
                </div>
              )}

              <details className="mt-3">

                <summary className="cursor-pointer font-medium">
                  Detected headers
                </summary>

                <p className="mt-1 break-words text-xs">
                  {previewResult.headers?.join(', ')}
                </p>

              </details>

            </div>
          )}

          {previewError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {previewError}
            </div>
          )}

          {isImporting && (

            <div className="flex items-center gap-2 text-sm text-blue-700">

              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />

              <span>
                Importing records. Please keep
                this window open...
              </span>

            </div>

          )}

          {importResult && (

            <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-800">

              {importResult}

            </div>

          )}

          {importError && (

            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">

              {importError}

            </div>

          )}

        </div>

      </Modal>

      {/* Delete Confirmation Modal */}

      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete Record"
        footer={
          <>

            <Button
              variant="ghost"
              onClick={() =>
                setDeleteId(null)
              }
            >
              Cancel
            </Button>

            <Button
              variant="danger"
              onClick={handleDelete}
            >
              Delete Record
            </Button>

          </>
        }
      >

        <p className="text-slate-600">
          Are you sure you want to delete this
          record? This action cannot be undone.
        </p>

      </Modal>

    </div>
  );
}
