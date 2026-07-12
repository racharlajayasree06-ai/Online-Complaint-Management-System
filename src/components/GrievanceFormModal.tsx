import React, { useState, useEffect } from 'react';
import { X, Search, User, MapPin, Layers, Save, CheckCircle, FileText } from 'lucide-react';
import { searchCitizens, createComplaint } from '../lib/api';
import { useTranslation } from 'react-i18next';

interface GrievanceFormModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function GrievanceFormModal({ onClose, onSuccess }: GrievanceFormModalProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Mutation Delays');
  const [priority, setPriority] = useState('medium');
  const [location, setLocation] = useState('');
  const [surveyNumber, setSurveyNumber] = useState('');
  const [district, setDistrict] = useState('Guntur');
  const [mandal, setMandal] = useState('Guntur East');
  const [village, setVillage] = useState('Venkatapuram');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; type: string; size: number; content: string }[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files) as File[];

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        setUploadedFiles(prev => [
          ...prev,
          {
            name: file.name,
            type: file.type,
            size: file.size,
            content: reader.result as string
          }
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Citizen search state
  const [searchQuery, setSearchQuery] = useState('');
  const [citizens, setCitizens] = useState<any[]>([]);
  const [selectedCitizen, setSelectedCitizen] = useState<any | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setCitizens([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchCitizens(searchQuery);
        setCitizens(results);
      } catch (err) {
        console.error('Failed to search citizens registry:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!title || !description || !location || !surveyNumber) {
      setError('Please fully load all required fields including survey number coordinates.');
      return;
    }

    try {
      const payload = {
        title,
        description,
        category,
        priority,
        location,
        surveyNumber,
        district,
        mandal,
        village,
        landIssueType: category,
        targetCitizenId: selectedCitizen ? selectedCitizen.id : undefined,
        documents: uploadedFiles
      };
      await createComplaint(payload);
      setSuccessMsg('Grievance Docket filed and logged successfully! Routed to seed VRO Srinivas Rao.');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to lodge grievance.');
    }
  };

  const mandalVillages: Record<string, string[]> = {
    "Guntur East": ["Venkatapuram", "Brodipet", "Jonnalagadda", "Gunadala"],
    "Tenali": ["Chinaravutla", "Ravipadu", "Nandur", "Kakaralamudi"],
    "Nizampatnam": ["Nizampatnam", "Pinapadu", "Patamata", "Ajit Singh Nagar", "Bandar", "Chilakalapudi"]
  };

  const handleMandalChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setMandal(val);
    const villages = mandalVillages[val] || [];
    if (villages.length > 0) {
      setVillage(villages[0]);
    }
  };

  return (
    <div
      id="grievance-form-modal"
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in"
    >
      <div
        id="form-modal-container"
        className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
      >
        <div id="form-modal-header" className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
              <Layers className="w-4 h-4 text-brand-600" />
              <span>Record official Prajavani docket</span>
            </h3>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
              Lodge land grievance complaints on behalf of verified citizens
            </p>
          </div>
          <button
            id="close-form-btn"
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200 rounded-full text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div id="form-alert-error" className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-xs font-semibold">
              {error}
            </div>
          )}

          {successMsg && (
            <div id="form-alert-success" className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-lg text-xs font-semibold flex items-center space-x-2">
              <CheckCircle className="w-4 h-4" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Citizen Lookup Room */}
          <div id="citizen-lookup-block" className="space-y-2 border border-slate-100 bg-slate-50/50 p-4 rounded-xl">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span>Target Citizen Client</span>
            </span>

            {selectedCitizen ? (
              <div id="selected-citizen-tray" className="bg-white border border-slate-200 p-3 rounded-lg flex items-center justify-between">
                <div>
                  <p className="text-xs font-extrabold text-slate-800">{selectedCitizen.fullName}</p>
                  <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                    Phone: {selectedCitizen.mobile} • Email: {selectedCitizen.email}
                  </p>
                </div>
                <button
                  id="remove-selected-citizen"
                  type="button"
                  onClick={() => setSelectedCitizen(null)}
                  className="text-xs text-red-600 hover:underline font-bold cursor-pointer"
                >
                  Unselect
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="relative flex items-center bg-white border border-slate-200 rounded-lg shadow-sm">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3" />
                  <input
                    id="citizen-search-input"
                    type="text"
                    placeholder="Search citizens by name, email, or mobile..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs font-semibold text-slate-700 placeholder-slate-400 outline-none"
                  />
                  {isSearching && (
                    <span className="text-[10px] text-slate-400 font-bold mr-3 animate-pulse">Searching...</span>
                  )}
                </div>

                {citizens.length > 0 && (
                  <div id="citizen-search-results" className="absolute left-0 mt-1.5 w-full bg-white border border-slate-200 rounded-lg shadow-lg z-30 divide-y divide-slate-100 max-h-40 overflow-y-auto">
                    {citizens.map(cit => (
                      <div
                        id={`citizen-${cit.id}`}
                        key={cit.id}
                        onClick={() => {
                          setSelectedCitizen(cit);
                          setSearchQuery('');
                          setCitizens([]);
                        }}
                        className="p-2.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer"
                      >
                        <div>
                          <p className="text-xs font-extrabold text-slate-800">{cit.fullName}</p>
                          <p className="text-[10px] text-slate-500 font-semibold">{cit.mobile} • {cit.email}</p>
                        </div>
                        <span className="text-[10px] bg-brand-50 text-brand-600 font-bold px-2 py-0.5 rounded border border-brand-100">Select</span>
                      </div>
                    ))}
                  </div>
                )}
                {searchQuery.trim().length >= 2 && citizens.length === 0 && !isSearching && (
                  <p className="text-[10px] text-slate-400 font-bold mt-1.5 ml-1">No matching citizens inside registry. Defaults representation to public database.</p>
                )}
              </div>
            )}
          </div>

          {/* Core Grievance Fields */}
          <div id="grievance-key-fields" className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <label id="lbl-title" className="text-[10px] tracking-wider uppercase font-extrabold text-slate-500">Complaint Title Summary</label>
              <input
                id="complaint-title"
                type="text"
                placeholder="e.g. Passbook Father Name Corrective Survey"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:border-brand-500"
                required
              />
            </div>

            <div className="col-span-2 space-y-1.5">
              <label id="lbl-desc" className="text-[10px] tracking-wider uppercase font-extrabold text-slate-500">Description details</label>
              <textarea
                id="complaint-desc"
                placeholder="Describe the complaint in detail..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:border-brand-500 resize-none"
                required
              ></textarea>
            </div>

            <div className="space-y-1.5">
              <label id="lbl-category" className="text-[10px] tracking-wider uppercase font-extrabold text-slate-500">Dispute Classification</label>
              <select
                id="complaint-category-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:bg-white cursor-pointer"
              >
                <option value="Mutation Delays">Mutation Delays</option>
                <option value="Land boundary disputes">Land Boundary Disputes</option>
                <option value="Record correction requests">Record Correction Requests</option>
                <option value="Double Registrations">Double Registration Claim</option>
                <option value="Encroachments">Pathway Encroachments</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label id="lbl-priority" className="text-[10px] tracking-wider uppercase font-extrabold text-slate-500">SLA Priority Tier</label>
              <select
                id="complaint-priority-select"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:bg-white cursor-pointer"
              >
                <option value="low">Low (Standard SLA)</option>
                <option value="medium">Medium (Moderate SLA)</option>
                <option value="high">High (Priority Dispatch)</option>
                <option value="urgent">Urgent (Express Immediate)</option>
              </select>
            </div>
          </div>

          {/* Land boundary specifics */}
          <div id="land-specifics-block" className="space-y-3 border border-slate-100 bg-slate-50/50 p-4 rounded-xl">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>Revenue Territorial Bounds</span>
            </span>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label id="lbl-district" className="text-[9px] uppercase font-bold text-slate-400">Jurisdiction District</label>
                <select
                  id="district-select"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                >
                  <option value="Guntur">Guntur</option>
                </select>
              </div>

              <div className="space-y-1">
                <label id="lbl-mandal" className="text-[9px] uppercase font-bold text-slate-400">Jurisdiction Mandal</label>
                <select
                  id="mandal-select"
                  value={mandal}
                  onChange={handleMandalChange}
                  className="w-full p-2 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                >
                  <option value="Guntur East">Guntur East</option>
                  <option value="Tenali">Tenali</option>
                  <option value="Nizampatnam">Nizampatnam</option>
                </select>
              </div>

              <div className="space-y-1">
                <label id="lbl-village" className="text-[9px] uppercase font-bold text-slate-400">Revenue Village</label>
                <select
                  id="village-select"
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                >
                  {(mandalVillages[mandal] || []).map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label id="lbl-surveyno" className="text-[9px] uppercase font-bold text-slate-400">Survey No / Khata No</label>
                <input
                  id="survey-number-input"
                  type="text"
                  placeholder="e.g. 452/B or 108/A"
                  value={surveyNumber}
                  onChange={(e) => setSurveyNumber(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-700 outline-none"
                  required
                />
              </div>

              <div className="col-span-2 space-y-1">
                <label id="lbl-location" className="text-[9px] uppercase font-bold text-slate-400">Local Area Landmark Street Address</label>
                <input
                  id="location-input"
                  type="text"
                  placeholder="e.g. Opp Gram Panchayat Office, Ram Nagar"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-700 outline-none"
                  required
                />
              </div>
            </div>
          </div>

          {/* Supporting Documents */}
          <div id="supporting-documents-block" className="space-y-3 border border-slate-100 bg-slate-50/50 p-4 rounded-xl">
            <span className="text-xs font-bold text-slate-705 uppercase tracking-wider flex items-center space-x-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-450" />
              <span>Supporting Documents</span>
            </span>
            <div className="space-y-2">
              <label className="text-[9px] uppercase font-bold text-slate-400">Upload Attachments (PDF, DOC/X, JPG/JPEG, PNG, ZIP)</label>
              <input
                id="documents-upload-input"
                type="file"
                multiple
                onChange={handleFileChange}
                className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-[10px] file:font-extrabold file:bg-slate-100 file:text-slate-800 hover:file:bg-slate-200 cursor-pointer"
              />
              {uploadedFiles.length > 0 && (
                <div className="space-y-1.5 pt-1.5">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Uploaded List:</span>
                  <div className="flex flex-wrap gap-2">
                    {uploadedFiles.map((file, idx) => (
                      <div key={idx} className="bg-white border border-slate-200 rounded px-2.5 py-1 flex items-center space-x-2 text-[10px] font-semibold text-slate-700 shadow-sm">
                        <span className="truncate max-w-[150px]">{file.name}</span>
                        <span className="text-slate-400 font-mono text-[8.5px]">({(file.size / 1024).toFixed(1)} KB)</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(idx)}
                          className="text-red-500 hover:text-red-700 font-bold focus:outline-none cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div id="form-actions-tray" className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
            <button
              id="cancel-form-btn"
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="submit-form-btn"
              type="submit"
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-lg shadow transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{t('common.submit')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
