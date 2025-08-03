import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FileUp, Search, Download, Share2, RotateCcw, Info, Lightbulb, Move, X, Sparkles, Brain, Zap } from 'lucide-react';
import Tippy from '@tippyjs/react'; // Import Tippy
import 'tippy.js/dist/tippy.css'; // Tippy.js default styles
import axios from 'axios';
import './App.css'; // Import the new App.css file

// Base URL for your backend API
const API_BASE_URL = 'http://127.0.0.1:5000';

// Main App component
const App = () => {
  const [documentContent, setDocumentContent] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false); 
  const [highlightedContent, setHighlightedContent] = useState(null);
  const [suggestedWords, setSuggestedWords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // --- Modal Dragging States ---
  const [isDragging, setIsDragging] = useState(false);
  // Initial modal position (top-right, will be calculated on open)
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 }); 
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 }); 
  const modalRef = useRef(null); // Ref for the modal panel

  // --- Modal Input Definition States ---
  const [modalInputValue, setModalInputValue] = useState('');
  const [modalInputDefinition, setModalInputDefinition] = useState(''); 
  const [isModalDefinitionLoading, setIsModalDefinitionLoading] = useState(false); 

  const documentRef = useRef(null);

  // --- Effects ---
  useEffect(() => {
    if (searchTerm && documentContent) {
      handleSearch(searchTerm, documentContent);
    } else {
      setHighlightedContent(documentContent);
    }
  }, [searchTerm, documentContent]);

  // Effect for Debounced Definition Fetch in Modal
  useEffect(() => {
    if (modalInputValue.trim() === '') {
      setModalInputDefinition('');
      return;
    }

    setIsModalDefinitionLoading(true); 
    const handler = setTimeout(async () => {
      try {
        const response = await axios.post(`${API_BASE_URL}/definitions`, { word: modalInputValue.trim() });
        setModalInputDefinition(response.data.definition || 'No definition found.');
      } catch (err) {
        console.error(`Error fetching definition for '${modalInputValue}' in modal:`, err);
        setModalInputDefinition('Could not fetch definition.');
      } finally {
        setIsModalDefinitionLoading(false); 
      }
    }, 1000); // Debounce for 1 second

    return () => {
      clearTimeout(handler); // Clear timeout if input changes before delay
    };
  }, [modalInputValue]);

  // --- Modal Dragging Logic ---
  const handleMouseDown = useCallback((e) => {
    e.preventDefault(); 
    if (modalRef.current) {
      setIsDragging(true);
      const rect = modalRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;

    setModalPosition({
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y,
    });
  }, [isDragging, dragOffset]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add global mouse event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Effect to position modal when it opens, or re-position on window resize
  useEffect(() => {
    const positionModal = () => {
      if (showModal && modalRef.current) {
        // Position to top-right
        const padding = 16; // Tailwind p-4 equivalent
        setModalPosition({
          x: window.innerWidth - modalRef.current.offsetWidth - padding,
          y: padding,
        });
      }
    };

    // Position immediately when modal opens
    positionModal();

    // Reposition on window resize
    window.addEventListener('resize', positionModal);
    return () => window.removeEventListener('resize', positionModal);
  }, [showModal]);


  // --- API Calls ---

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) { return; }

    setIsLoading(true);
    setError('');
    setDocumentContent('');
    setHighlightedContent(null);
    setSearchTerm('');
    setSuggestedWords([]);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setDocumentContent(response.data.content);
      alert('File uploaded and parsed successfully! Now enter a word to search.');
    } catch (err) {
      console.error('File upload error:', err);
      setError('Failed to upload and parse file. Please try again.');
      alert('Failed to upload and parse file. Check console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (term, content) => {
    setIsLoading(true);
    setError('');
    setSuggestedWords([]);

    try {
      const response = await axios.post(`${API_BASE_URL}/search`, {
        searchTerm: term,
        documentContent: content,
      });
      setSuggestedWords(response.data.suggestedWords);
      highlightText(term, response.data.semanticMatches);
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to perform search. Please try again.');
      alert('Failed to perform search. Check console for details.');
      setHighlightedContent(content);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Event Handlers ---
  const openDocument = () => {
    if (!documentContent) {
      alert('Please upload a file first.');
      return;
    }
    setShowModal(true);
    setModalInputValue(searchTerm); // Initialize modal input with current search term
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const inputWord = e.target.elements.searchWord.value.trim();
    if (!inputWord) {
      alert('Please enter a word to search.');
      return;
    }
    setSearchTerm(inputWord);
    setShowModal(false); // Close modal after submission
  };

  // Core highlighting logic
  const highlightText = (wordToHighlight, semanticMatches = []) => {
    if (!documentContent || !wordToHighlight) {
      setHighlightedContent(documentContent);
      return;
    }

    const words = documentContent.split(/(\b\w+\b|[.,!?;:()"\s]+)/g);
    const lowerCaseSearchTerm = wordToHighlight.toLowerCase();
    const lowerCaseSemanticMatches = semanticMatches.map(w => w.toLowerCase());

    const exactMatchColor = 'bg-yellow-300'; 
    const semanticMatchColor = 'bg-green-300'; 

    const highlighted = words.map((part, index) => {
      const trimmedPart = part.trim();
      const lowerCasePart = trimmedPart.toLowerCase();

      // Check for exact match
      if (lowerCasePart === lowerCaseSearchTerm) {
        return (
          <Tippy
            key={index}
            content={<DefinitionTooltip word={trimmedPart} />}
            placement="top"
            trigger="mouseenter focus"
            animation="fade"
            duration={100}
            delay={[100, 0]}
          >
            <span className={`rounded-md px-1 cursor-pointer ${exactMatchColor}`}>
              {part}
            </span>
          </Tippy>
        );
      }
      // Check for semantic match (synonym)
      else if (lowerCaseSemanticMatches.includes(lowerCasePart)) {
        return (
          <Tippy
            key={index}
            content={<DefinitionTooltip word={trimmedPart} />}
            placement="top"
            trigger="mouseenter focus"
            animation="fade"
            duration={100}
            delay={[100, 0]}
          >
            <span className={`rounded-md px-1 cursor-pointer ${semanticMatchColor}`}>
              {part}
            </span>
          </Tippy>
        );
      }
      // Default: no highlight, but still make words hoverable if a definition exists
      else if (/\b\w+\b/.test(trimmedPart)) { // If it's a word (alphanumeric)
        return (
          <Tippy
            key={index}
            content={<DefinitionTooltip word={trimmedPart} />}
            placement="top"
            trigger="mouseenter focus"
            animation="fade"
            duration={100}
            delay={[100, 0]}
          >
            <span className="cursor-pointer">
              {part}
            </span>
          </Tippy>
        );
      }
      return part; // Return as is for non-words (spaces, punctuation)
    });
    setHighlightedContent(highlighted);
  };

  // Component for the definition tooltip content
  const DefinitionTooltip = ({ word }) => {
    const [definition, setDefinition] = useState('Loading definition...');
    const [defLoading, setDefLoading] = useState(true);
    const [defError, setDefError] = useState(false);

    useEffect(() => {
      const fetchDefinition = async () => {
        setDefLoading(true);
        setDefError(false);
        try {
          const response = await axios.post(`${API_BASE_URL}/definitions`, { word: word });
          setDefinition(response.data.definition || 'No definition found.');
        } catch (err) {
          console.error(`Error fetching definition for '${word}' from backend:`, err);
          setDefinition('Failed to load definition.');
          setDefError(true);
        } finally {
          setDefLoading(false);
        }
      };
      fetchDefinition();
    }, [word]); // Re-fetch if the word changes

    return (
      <div className="max-w-xs text-sm p-2 rounded-lg shadow-md bg-gray-800 text-white">
        <strong className="capitalize">{word}:</strong> {defLoading ? 'Loading...' : (defError ? 'Error fetching definition.' : definition)}
      </div>
    );
  };

  // Selects a suggested word and triggers re-highlighting
  const selectSuggestedWord = (word) => {
    setSearchTerm(word);
  };

  // Resets the search and clears highlights
  const resetSearch = () => {
    setSearchTerm('');
    setHighlightedContent(documentContent); // Show original content
    setSuggestedWords([]);
    setError('');
    setIsLoading(false);
  };

  // --- Placeholder Functions for Backend-dependent Features (PDF Download, Share) ---
  const handleDownloadPdf = async () => {
      if (!highlightedContent) {
          alert("Please upload a document and perform a search first to generate highlighted content.");
          return;
      }

      setIsLoading(true);
      setError('');

      const documentHtml = documentRef.current ? documentRef.current.innerHTML : '';
      const cleanHtml = documentHtml.replace(/data-tippy-.*?=".*?"/g, '')
                                    .replace(/<div class="tippy-box".*?<\/div>/g, '');

      try {
          const response = await axios.post(`${API_BASE_URL}/download_pdf`, {
              highlightedHtml: cleanHtml,
              filename: 'smartdoc_insight_highlights.pdf'
          }, {
              responseType: 'blob' // Important: Expect a binary response (PDF)
          });

          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', 'smartdoc_insight_highlights.pdf');
          document.body.appendChild(link);
          link.click();
          link.parentNode.removeChild(link);
          window.URL.revokeObjectURL(url);
          alert("PDF download initiated!");

      } catch (err) {
          console.error('PDF download error:', err);
          if (err.response && err.response.data) {
              const reader = new FileReader();
              reader.onload = function() {
                  try {
                      const errorData = JSON.parse(reader.result);
                      setError(`PDF download failed: ${errorData.error || 'Unknown error'}`);
                  } catch {
                      setError('PDF download failed: Server error or invalid response.');
                  }
              };
              reader.readAsText(err.response.data);
          } else {
              setError(`PDF download failed: ${err.message}.`);
          }
          alert('Failed to download PDF. Check console for details.');
      } finally {
          setIsLoading(false);
      }
  };

  const handleShareLink = async () => {
      if (!documentContent || !searchTerm) {
          alert("Please upload a document and perform a search first to create a session to share.");
          return;
      }

      setIsLoading(true);
      setError('');

      const documentHtml = documentRef.current ? documentRef.current.innerHTML : '';
      const cleanHtml = documentHtml.replace(/data-tippy-.*?=".*?"/g, '')
                                    .replace(/<div class="tippy-box".*?<\/div>/g, '');

      try {
          const response = await axios.post(`${API_BASE_URL}/session/save`, {
              searchTerm: searchTerm,
              documentContent: documentContent, // Send full content for session reconstruction
              highlightedHtml: cleanHtml // Send the highlighted HTML for display
          });

          const shareableLink = response.data.shareableLink;
          // Copy to clipboard
          navigator.clipboard.writeText(shareableLink).then(() => {
              alert(`Session link copied to clipboard: ${shareableLink}`);
          }).catch(err => {
              console.error('Failed to copy link to clipboard:', err);
              alert(`Session saved! Link: ${shareableLink} (Failed to copy to clipboard)`);
          });

      } catch (err) {
          console.error('Share session error:', err);
          setError('Failed to share session. Please try again.');
          alert('Failed to share session. Check console for details.');
      } finally {
          setIsLoading(false);
      }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 font-sans text-white overflow-x-hidden">
      {/* Animated background particles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute top-40 right-20 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-4000"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Brain className="h-16 w-16 text-cyan-400 mr-4 animate-pulse" />
            <h1 className="text-6xl md:text-7xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent drop-shadow-2xl">
              SmartDoc Insight
            </h1>
            <Sparkles className="h-16 w-16 text-pink-400 ml-4 animate-bounce" />
          </div>
          <p className="text-xl text-gray-300 font-light">Intelligent Document Analysis with AI-Powered Insights</p>
        </div>

        {/* Main Action Buttons */}
        <div className="flex flex-wrap justify-center gap-6 mb-12 w-full max-w-4xl">
          <label
            htmlFor="file-upload"
            className="group flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 text-white rounded-2xl shadow-2xl hover:shadow-cyan-500/25 transition-all duration-500 transform hover:scale-110 hover:-translate-y-2 cursor-pointer focus:outline-none focus:ring-4 focus:ring-purple-500/50 border border-purple-400/30 backdrop-blur-sm"
          >
            <FileUp className="mr-3 h-6 w-6 group-hover:animate-bounce" />
            <span className="text-lg font-semibold">Upload Document</span>
            <input id="file-upload" type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.docx" />
          </label>
          
          <button
            onClick={openDocument}
            className="group flex items-center px-8 py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white rounded-2xl shadow-2xl hover:shadow-emerald-500/25 transition-all duration-500 transform hover:scale-110 hover:-translate-y-2 focus:outline-none focus:ring-4 focus:ring-emerald-500/50 border border-emerald-400/30 backdrop-blur-sm"
            disabled={isLoading || !documentContent}
          >
            <Search className="mr-3 h-6 w-6 group-hover:animate-pulse" />
            <span className="text-lg font-semibold">Analyze Content</span>
            {isLoading && <Zap className="ml-2 h-5 w-5 animate-spin" />}
          </button>
        </div>

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-center justify-center text-cyan-300 text-xl mb-8 bg-black/20 backdrop-blur-sm rounded-2xl px-8 py-4 border border-cyan-500/30">
            <div className="flex space-x-1 mr-4">
              <div className="w-3 h-3 bg-cyan-400 rounded-full animate-bounce"></div>
              <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
              <div className="w-3 h-3 bg-pink-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
            </div>
            <span className="font-medium">Processing with AI Magic...</span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-gradient-to-r from-red-600/80 to-pink-600/80 backdrop-blur-sm border border-red-400/50 text-white px-6 py-4 rounded-2xl relative mb-8 shadow-2xl" role="alert">
            <strong className="font-bold">Error!</strong>
            <span className="block sm:inline ml-2">{error}</span>
          </div>
        )}

        {/* Custom Search Input Modal */}
        {showModal && (
          <div 
            ref={modalRef} // Attach ref for dragging
            className="absolute bg-gradient-to-br from-gray-900/95 via-purple-900/95 to-gray-900/95 backdrop-blur-xl p-6 rounded-3xl shadow-2xl animate-fade-in-up z-50"
            style={{ left: modalPosition.x, top: modalPosition.y }}
          >
            <div 
              className="flex items-center justify-between p-4 mb-6 bg-gradient-to-r from-purple-800/50 to-pink-800/50 rounded-2xl cursor-grab hover:from-purple-700/50 hover:to-pink-700/50 transition-all duration-300 border border-purple-400/30"
              onMouseDown={handleMouseDown} // Drag handle
            >
              <h2 className="text-xl font-bold text-white flex items-center">
                <Move className="mr-3 h-6 w-6 text-cyan-400" />
                Enter Word to Highlight
              </h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-gray-300 hover:text-white transition-colors duration-200 hover:bg-red-500/20 rounded-full p-2"
              >
                <X className="h-6 w-6" /> {/* Changed to X icon */}
              </button>
            </div>
            
            <form onSubmit={handleSearchSubmit} className="flex flex-col gap-6">
              <input
                type="text"
                name="searchWord"
                placeholder="e.g., 'intelligence', 'innovation', 'analysis'"
                className="w-full px-6 py-4 border border-purple-400/30 rounded-2xl focus:ring-4 focus:ring-cyan-500/50 focus:border-cyan-400 text-lg bg-black/30 backdrop-blur-sm text-white placeholder-gray-300 transition-all duration-300"
                value={modalInputValue} // Controlled component
                onChange={(e) => setModalInputValue(e.target.value)} // Update state on change
                autoFocus
              />
              
              {modalInputValue.trim() !== '' && (
                <div className="text-sm text-gray-200 bg-gradient-to-r from-gray-800/50 to-purple-800/50 backdrop-blur-sm p-4 rounded-2xl border border-gray-600/30">
                  <strong className="text-cyan-300">Definition:</strong>{' '}
                  {isModalDefinitionLoading ? (
                    <span className="animate-pulse">Loading definition...</span>
                  ) : (
                    modalInputDefinition || 'No definition found.'
                  )}
                </div>
              )}
              
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-cyan-600 to-purple-600 text-white py-4 rounded-2xl text-lg font-semibold shadow-2xl hover:shadow-cyan-500/25 hover:from-cyan-500 hover:to-purple-500 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-cyan-500/50 transform hover:scale-105"
              >
                ✨ Highlight with AI
              </button>
              
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-full bg-gradient-to-r from-gray-700 to-gray-600 text-white py-4 rounded-2xl text-lg font-medium shadow-xl hover:from-gray-600 hover:to-gray-500 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-gray-500/50"
              >
                Cancel
              </button>
            </form>
          </div>
        )}

        {/* Document Display Area */}
        <div
          ref={documentRef}
          className="document-viewer-scroll-area bg-gradient-to-br from-white/95 to-gray-50/95 backdrop-blur-sm text-gray-800 p-8 md:p-12 rounded-3xl shadow-2xl border border-gray-200/50 w-full max-w-6xl text-lg leading-relaxed whitespace-pre-wrap mb-12 relative"
          style={{
            height: '400px', // Fixed height
            maxHeight: '70vh', // Responsive max-height
            overflowY: 'auto', // Enable vertical scrolling
            overflowX: 'hidden' // Hide horizontal scrollbar
          }}
        >
          {documentContent ? highlightedContent || documentContent : (
            <div className="text-center py-20">
              <Brain className="h-24 w-24 text-gray-400 mx-auto mb-6 animate-pulse" />
              <p className="text-gray-500 text-xl">Upload a document to unlock AI-powered insights</p>
            </div>
          )}
        </div>

        {/* AI Suggested Related Words */}
        {searchTerm && suggestedWords.length > 0 && (
          <div className="bg-gradient-to-br from-purple-900/40 via-pink-900/40 to-purple-900/40 backdrop-blur-sm p-8 rounded-3xl shadow-2xl border border-purple-400/30 w-full max-w-6xl mb-12">
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
              <Lightbulb className="mr-3 h-8 w-8 text-yellow-400 animate-pulse" />
              AI-Powered Related Words
            </h3>
            <div className="flex flex-wrap gap-4">
              {suggestedWords.map((word, index) => (
                <button
                  key={index}
                  onClick={() => selectSuggestedWord(word)}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500/80 to-purple-500/80 backdrop-blur-sm text-white rounded-2xl text-base font-medium hover:from-blue-400/80 hover:to-purple-400/80 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 border border-blue-400/30"
                >
                  {word}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer Action Buttons */}
        <div className="flex flex-wrap justify-center gap-6 w-full max-w-4xl mb-12">
          <button
            onClick={handleDownloadPdf}
            className="group flex items-center px-8 py-4 bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 text-white rounded-2xl shadow-2xl hover:shadow-emerald-500/25 transition-all duration-500 transform hover:scale-110 hover:-translate-y-2 focus:outline-none focus:ring-4 focus:ring-emerald-500/50 border border-emerald-400/30"
          >
            <Download className="mr-3 h-6 w-6 group-hover:animate-bounce" />
            <span className="text-lg font-semibold">Export Highlights</span>
          </button>
          
          <button
            onClick={handleShareLink}
            className="group flex items-center px-8 py-4 bg-gradient-to-r from-pink-600 via-rose-600 to-red-600 text-white rounded-2xl shadow-2xl hover:shadow-pink-500/25 transition-all duration-500 transform hover:scale-110 hover:-translate-y-2 focus:outline-none focus:ring-4 focus:ring-pink-500/50 border border-pink-400/30"
          >
            <Share2 className="mr-3 h-6 w-6 group-hover:animate-spin" />
            <span className="text-lg font-semibold">Share Analysis</span>
          </button>
          
          <button
            onClick={resetSearch}
            className="group flex items-center px-8 py-4 bg-gradient-to-r from-gray-600 via-slate-600 to-gray-700 text-white rounded-2xl shadow-2xl hover:shadow-gray-500/25 transition-all duration-500 transform hover:scale-110 hover:-translate-y-2 focus:outline-none focus:ring-4 focus:ring-gray-500/50 border border-gray-400/30"
            disabled={isLoading}
          >
            <RotateCcw className="mr-3 h-6 w-6 group-hover:animate-spin" />
            <span className="text-lg font-semibold">Reset Analysis</span>
          </button>
        </div>

        {/* Instructions/Legend */}
        <div className="p-8 bg-gradient-to-br from-gray-900/60 via-purple-900/60 to-gray-900/60 backdrop-blur-sm rounded-3xl shadow-2xl border border-gray-600/30 w-full max-w-2xl text-gray-200">
          <h4 className="font-bold text-white mb-6 flex items-center text-xl">
            <Info className="mr-3 h-7 w-7 text-cyan-400" />
            How SmartDoc Insight Works
          </h4>
          <div className="space-y-4 text-base">
            <div className="flex items-center">
              <FileUp className="h-5 w-5 text-blue-400 mr-3" />
              <span>Upload PDF or DOCX documents for AI analysis</span>
            </div>
            <div className="flex items-center">
              <Search className="h-5 w-5 text-emerald-400 mr-3" />
              <span>Enter keywords to highlight and analyze content</span>
            </div>
            <div className="flex items-center">
              <span className="inline-block w-6 h-4 rounded bg-gradient-to-r from-yellow-300 to-yellow-400 mr-3"></span>
              <span>Exact matches highlighted in golden yellow</span>
            </div>
            <div className="flex items-center">
              <span className="inline-block w-6 h-4 rounded bg-gradient-to-r from-emerald-300 to-emerald-400 mr-3"></span>
              <span>AI-detected related terms in emerald green</span>
            </div>
            <div className="flex items-center">
              <Lightbulb className="h-5 w-5 text-yellow-400 mr-3" />
              <span>Hover over any word for instant AI-powered definitions</span>
            </div>
            <div className="flex items-center">
              <Sparkles className="h-5 w-5 text-pink-400 mr-3" />
              <span>Click suggested words to discover semantic connections</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;