'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Tldraw, Editor, createTLStore, defaultShapeUtils, defaultBindingUtils } from 'tldraw'
import 'tldraw/tldraw.css'

interface PDFViewerProps {
  url: string
  fileName: string
  fileId: string
  userId: string
  onClose: () => void
}

export function PDFViewer({ url, fileName, fileId, userId, onClose }: PDFViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [editor, setEditor] = useState<Editor | null>(null)
  const [store, setStore] = useState<ReturnType<typeof createTLStore> | null>(null)
  const [saving, setSaving] = useState(false)
  const [scale, setScale] = useState(1.0)
  const [pdfPages, setPdfPages] = useState<{ pageNum: number; dataUrl: string; width: number; height: number }[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageStores, setPageStores] = useState<Map<number, ReturnType<typeof createTLStore>>>(new Map())
  const [error, setError] = useState<{ message: string; code: string; fileId?: string } | null>(null)
  const [requestingAccess, setRequestingAccess] = useState(false)
  const [accessRequested, setAccessRequested] = useState(false)
  const [drawingEnabled, setDrawingEnabled] = useState(true)
  const [showControls, setShowControls] = useState(true)
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [isProtected, setIsProtected] = useState(false) // For screen capture protection
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [viewportWidth, setViewportWidth] = useState(800)
  const [viewportHeight, setViewportHeight] = useState(600)
  const protectionOverlayRef = useRef<HTMLDivElement>(null)

  // Extract Google Drive file ID
  const getGoogleDriveFileId = (url: string): string | null => {
    const patterns = [
      /\/d\/([a-zA-Z0-9_-]+)/,
      /id=([a-zA-Z0-9_-]+)/,
      /\/file\/d\/([a-zA-Z0-9_-]+)/,
    ]
    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) return match[1]
    }
    return null
  }

  const fileIdFromUrl = getGoogleDriveFileId(url)

  // Detect theme
  useEffect(() => {
    const checkTheme = () => {
      const isDark = document.documentElement.classList.contains('dark') || 
                     window.matchMedia('(prefers-color-scheme: dark)').matches
      setIsDarkMode(isDark)
    }
    checkTheme()
    
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', checkTheme)
    
    return () => {
      observer.disconnect()
      mediaQuery.removeEventListener('change', checkTheme)
    }
  }, [])

  // Track viewport size
  useEffect(() => {
    const updateViewport = () => {
      setViewportWidth(window.innerWidth)
      setViewportHeight(window.innerHeight)
    }
    updateViewport()
    window.addEventListener('resize', updateViewport)
    return () => window.removeEventListener('resize', updateViewport)
  }, [])

  // ============================================
  // AGGRESSIVE SCREEN CAPTURE PROTECTION
  // ============================================
  useEffect(() => {
    // Instant protection on blur
    const handleBlur = () => {
      setIsProtected(true)
    }
    
    // Check on focus
    const handleFocus = () => {
      setIsProtected(false)
    }
    
    // Instant protection on visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setIsProtected(true)
      } else {
        // Small delay to ensure we're actually visible
        setTimeout(() => setIsProtected(false), 50)
      }
    }

    // Detect resize (possible screenshot tool)
    const handleResize = () => {
      // Check if window was resized quickly (possible screenshot)
      setIsProtected(true)
      setTimeout(() => setIsProtected(false), 100)
    }

    // Block beforeunload to prevent quick screenshots
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      setIsProtected(true)
    }

    // Continuous check for screen capture
    let captureCheckInterval: NodeJS.Timeout
    const startCaptureCheck = () => {
      captureCheckInterval = setInterval(() => {
        // Check if document is hidden or blurred
        if (document.hidden || !document.hasFocus()) {
          setIsProtected(true)
        }
      }, 50) // Check every 50ms for faster response
    }

    // Override getDisplayMedia to detect screen sharing
    const originalGetDisplayMedia = navigator.mediaDevices?.getDisplayMedia?.bind(navigator.mediaDevices)
    if (originalGetDisplayMedia) {
      (navigator.mediaDevices as any).getDisplayMedia = async function(...args: any[]) {
        setIsProtected(true)
        throw new Error('Screen capture is not allowed')
      }
    }

    // Detect keyboard shortcuts for screenshots
    const handleKeyDown = (e: KeyboardEvent) => {
      // PrintScreen key
      if (e.key === 'PrintScreen') {
        e.preventDefault()
        setIsProtected(true)
        navigator.clipboard.writeText('').catch(() => {})
        setTimeout(() => setIsProtected(false), 500)
        return
      }
      
      // Windows: Win + Shift + S
      if (e.key === 'S' && e.shiftKey && e.metaKey) {
        e.preventDefault()
        setIsProtected(true)
        return
      }
      
      // Mac: Cmd + Shift + 3, 4, 5
      if (e.metaKey && e.shiftKey && ['3', '4', '5'].includes(e.key)) {
        e.preventDefault()
        setIsProtected(true)
        return
      }

      // Block common shortcuts
      if ((e.ctrlKey || e.metaKey) && ['s', 'p', 'u', 'i', 'j', 'c'].includes(e.key.toLowerCase())) {
        e.preventDefault()
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      // Check for PrintScreen release
      if (e.key === 'PrintScreen') {
        setIsProtected(true)
        setTimeout(() => setIsProtected(false), 500)
      }
    }

    // Add all listeners
    window.addEventListener('blur', handleBlur, true)
    window.addEventListener('focus', handleFocus, true)
    document.addEventListener('visibilitychange', handleVisibilityChange, true)
    window.addEventListener('resize', handleResize)
    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('keydown', handleKeyDown, true)
    document.addEventListener('keyup', handleKeyUp, true)
    startCaptureCheck()

    return () => {
      window.removeEventListener('blur', handleBlur, true)
      window.removeEventListener('focus', handleFocus, true)
      document.removeEventListener('visibilitychange', handleVisibilityChange, true)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('keydown', handleKeyDown, true)
      document.removeEventListener('keyup', handleKeyUp, true)
      clearInterval(captureCheckInterval)
      
      // Restore original getDisplayMedia
      if (originalGetDisplayMedia) {
        (navigator.mediaDevices as any).getDisplayMedia = originalGetDisplayMedia
      }
    }
  }, [])

  const isMobile = viewportWidth < 640
  const headerHeight = isMobile ? 48 : 52
  const footerHeight = 40

  // Initialize store for current page
  useEffect(() => {
    const initPageStore = async () => {
      if (pageStores.has(currentPage)) {
        setStore(pageStores.get(currentPage)!)
        return
      }

      const newStore = createTLStore({
        shapeUtils: [...defaultShapeUtils],
        bindingUtils: [...defaultBindingUtils],
      })
      
      setPageStores(prev => new Map(prev).set(currentPage, newStore))
      setStore(newStore)
    }
    initPageStore()
  }, [fileId, userId, currentPage, pageStores])

  // Load saved annotations when editor is ready
  useEffect(() => {
    const loadAnnotations = async () => {
      if (!editor) return
      
      try {
        const response = await fetch(`/api/annotations?fileId=${fileId}&userId=${userId}&page=${currentPage}`)
        if (response.ok) {
          const data = await response.json()
          if (data.annotationData) {
            try {
              const saved = JSON.parse(data.annotationData)
              if (saved.shapes && Array.isArray(saved.shapes)) {
                // Restore shapes
                saved.shapes.forEach((shapeData: any) => {
                  try {
                    editor.createShape(shapeData)
                  } catch {}
                })
              }
            } catch {}
          }
        }
      } catch {}
    }
    
    if (editor) {
      loadAnnotations()
    }
  }, [editor, fileId, userId, currentPage])

  // Load PDF
  useEffect(() => {
    const loadPDF = async () => {
      if (!fileIdFromUrl) {
        setError({ message: 'Invalid file link', code: 'INVALID_LINK' })
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/pdf-proxy?fileId=${fileIdFromUrl}`)
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
          setError({
            message: errorData.message || errorData.error || 'Could not load file',
            code: errorData.code || 'LOAD_ERROR',
            fileId: errorData.fileId || fileIdFromUrl
          })
          setLoading(false)
          return
        }

        const arrayBuffer = await response.arrayBuffer()
        const pdfjsLib = await loadPdfJs()
        if (!pdfjsLib) {
          setError({ message: 'PDF viewer not available', code: 'VIEWER_ERROR' })
          setLoading(false)
          return
        }

        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
        const pdfDoc = await loadingTask.promise
        setTotalPages(pdfDoc.numPages)
        
        const firstPage = await pdfDoc.getPage(1)
        const initialViewport = firstPage.getViewport({ scale: 1 })
        const padding = isMobile ? 16 : 32
        const maxWidth = viewportWidth - padding
        const fitScale = Math.min(maxWidth / initialViewport.width, 2.0)
        const finalScale = Math.max(fitScale * scale, 0.5)
        
        const pages: { pageNum: number; dataUrl: string; width: number; height: number }[] = []
        
        for (let i = 1; i <= pdfDoc.numPages; i++) {
          const page = await pdfDoc.getPage(i)
          const viewport = page.getViewport({ scale: finalScale })
          const canvas = document.createElement('canvas')
          canvas.width = viewport.width
          canvas.height = viewport.height
          const ctx = canvas.getContext('2d')
          if (ctx) {
            await page.render({ canvasContext: ctx, viewport }).promise
          }
          pages.push({ 
            pageNum: i, 
            dataUrl: canvas.toDataURL('image/png'),
            width: viewport.width,
            height: viewport.height
          })
        }
        
        setPdfPages(pages)
        setLoading(false)
      } catch {
        setError({ message: 'Unable to load this file', code: 'UNKNOWN_ERROR' })
        setLoading(false)
      }
    }

    loadPDF()
  }, [fileIdFromUrl, viewportWidth, scale, isMobile])

  // Save annotations for current page
  const saveAnnotations = useCallback(async () => {
    if (!editor || saving) return
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    
    saveTimeoutRef.current = setTimeout(async () => {
      setSaving(true)
      try {
        // Get all shapes from the editor
        const shapes = editor.getCurrentPageShapes()
        const shapesData = shapes.map(shape => ({
          id: shape.id,
          type: shape.type,
          x: shape.x,
          y: shape.y,
          rotation: shape.rotation,
          props: (shape as any).props || {},
        }))
        
        const response = await fetch('/api/annotations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            fileId, 
            userId, 
            page: currentPage,
            annotationData: JSON.stringify({ shapes: shapesData, timestamp: Date.now() }) 
          })
        })
        if (!response.ok) {
          console.error('Failed to save annotations:', response.status)
        }
      } catch (err) {
        console.error('Save error:', err)
      }
      finally { setSaving(false) }
    }, 500)
  }, [editor, fileId, userId, currentPage, saving])

  useEffect(() => {
    if (!editor) return
    // Save on any change
    const handleChange = () => saveAnnotations()
    editor.on('change', handleChange)
    return () => {
      editor.off('change', handleChange)
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [editor, saveAnnotations])

  const handleEditorMount = (e: Editor) => {
    setEditor(e)
    e.setCurrentTool('draw')
  }
  
  const handleClearDrawings = async () => {
    if (!editor) return
    editor.selectAll()
    editor.deleteShapes(editor.getSelectedShapeIds())
    await fetch(`/api/annotations?fileId=${fileId}&userId=${userId}&page=${currentPage}`, { method: 'DELETE' })
  }

  const handleZoomIn = () => setScale(Math.min(scale + 0.2, 2))
  const handleZoomOut = () => setScale(Math.max(scale - 0.2, 0.5))
  
  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1)
  }
  
  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1)
  }

  const handleRequestAccess = async () => {
    if (!error?.fileId) return
    setRequestingAccess(true)
    try {
      await fetch('/api/access-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: error.fileId, fileName, userId, fileUrl: url })
      })
      setAccessRequested(true)
    } catch {}
    finally { setRequestingAccess(false) }
  }
  
  // Prevent downloads
  useEffect(() => {
    const preventCtx = (e: MouseEvent) => e.preventDefault()
    const preventCopy = (e: ClipboardEvent) => e.preventDefault()
    const preventDrag = (e: DragEvent) => e.preventDefault()
    
    containerRef.current?.addEventListener('contextmenu', preventCtx)
    containerRef.current?.addEventListener('dragstart', preventDrag)
    document.addEventListener('copy', preventCopy)
    document.addEventListener('cut', preventCopy)
    
    return () => {
      containerRef.current?.removeEventListener('contextmenu', preventCtx)
      containerRef.current?.removeEventListener('dragstart', preventDrag)
      document.removeEventListener('copy', preventCopy)
      document.removeEventListener('cut', preventCopy)
    }
  }, [])

  // Auto-hide controls on mobile
  useEffect(() => {
    if (isMobile && showControls && !error && !loading) {
      const timer = setTimeout(() => setShowControls(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [isMobile, showControls, error, loading])

  const currentPageData = pdfPages.find(p => p.pageNum === currentPage)

  return (
    <div 
      ref={containerRef} 
      className="fixed inset-0 z-[100] flex flex-col select-none overflow-hidden" 
      onContextMenu={e => e.preventDefault()}
      onDragStart={e => e.preventDefault()}
      style={{ backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9' }}
    >
      {/* INSTANT BLACK SCREEN PROTECTION OVERLAY */}
      <div 
        ref={protectionOverlayRef}
        className="fixed inset-0 z-[9999] flex items-center justify-center"
        style={{ 
          backgroundColor: '#000000',
          display: isProtected ? 'flex' : 'none',
          transition: 'none', // No transition for instant response
        }}
      >
        <div className="text-center p-6">
          <div className="w-24 h-24 rounded-full bg-red-600/20 flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <p className="text-white text-2xl font-bold tracking-wide">🚫 CONTENT PROTECTED</p>
          <p className="text-gray-500 text-sm mt-3">Screen capture is not allowed</p>
        </div>
      </div>
      
      {/* Header */}
      <div 
        className={`absolute top-0 left-0 right-0 z-50 transition-transform duration-300 ${
          showControls || !isMobile ? 'translate-y-0' : '-translate-y-full'
        }`}
        style={{ 
          paddingTop: 'env(safe-area-inset-top, 0px)',
          backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)'
        }}
      >
        <div className="backdrop-blur-sm border-b px-3 py-2 flex items-center justify-between"
          style={{ borderColor: isDarkMode ? 'rgba(51, 65, 85, 0.5)' : 'rgba(226, 232, 240, 0.8)' }}>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="flex items-center gap-1 px-2 py-1.5 rounded-lg transition-colors"
              style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              {!isMobile && <span className="text-sm">Back</span>}
            </button>
            {!isMobile && (
              <span className="font-medium truncate max-w-[120px] text-sm"
                style={{ color: isDarkMode ? '#fff' : '#1e293b' }}>{fileName}</span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {/* Page Navigation */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1 rounded-lg px-1"
                style={{ backgroundColor: isDarkMode ? '#334155' : '#e2e8f0' }}>
                <button onClick={handlePrevPage} disabled={currentPage === 1}
                  className="px-2 py-1 disabled:opacity-40"
                  style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>
                  ‹
                </button>
                <span className="text-xs px-1" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>
                  {currentPage}/{totalPages}
                </span>
                <button onClick={handleNextPage} disabled={currentPage === totalPages}
                  className="px-2 py-1 disabled:opacity-40"
                  style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>
                  ›
                </button>
              </div>
            )}

            {store && !error && (
              <button 
                onClick={() => setDrawingEnabled(!drawingEnabled)}
                className="px-2 py-1 rounded-lg text-xs font-medium transition-colors"
                style={{
                  backgroundColor: drawingEnabled 
                    ? (isDarkMode ? '#14b8a6' : '#0d9488')
                    : (isDarkMode ? '#334155' : '#e2e8f0'),
                  color: drawingEnabled 
                    ? '#fff'
                    : (isDarkMode ? '#94a3b8' : '#64748b')
                }}
              >
                ✏️ {drawingEnabled ? 'ON' : 'OFF'}
              </button>
            )}

            {!error && !isMobile && (
              <div className="flex items-center rounded overflow-hidden"
                style={{ backgroundColor: isDarkMode ? '#334155' : '#e2e8f0' }}>
                <button onClick={handleZoomOut} className="px-2 py-1 text-sm"
                  style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>−</button>
                <span className="px-1 text-xs" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>{Math.round(scale * 100)}%</span>
                <button onClick={handleZoomIn} className="px-2 py-1 text-sm"
                  style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>+</button>
              </div>
            )}

            {!error && (
              <>
                <span className="px-1.5 py-0.5 rounded text-xs"
                  style={{ backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.3)', color: '#f59e0b' }}>
                  View Only
                </span>
                {saving && <span className="px-1.5 py-0.5 rounded text-xs animate-pulse"
                  style={{ backgroundColor: 'rgba(20, 184, 166, 0.2)', color: '#14b8a6' }}>💾</span>}
                {!isMobile && (
                  <button onClick={handleClearDrawings} className="px-2 py-1 rounded-lg text-xs"
                    style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}>
                    Clear
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile tap zone */}
      {isMobile && !error && !loading && (
        <div className="absolute top-12 left-0 right-0 h-16 z-40" onClick={() => setShowControls(!showControls)} />
      )}

      {/* Content */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-teal-500/30 border-t-teal-500 rounded-full animate-spin mx-auto mb-3" />
            <p style={{ color: isDarkMode ? '#94a3b8' : '#64748b' }}>Loading PDF...</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center max-w-xs p-6 rounded-2xl"
            style={{ backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.9)' }}>
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4`}
              style={{ backgroundColor: error.code === 'RESTRICTED_FILE' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)' }}>
              <svg className="w-7 h-7" style={{ color: error.code === 'RESTRICTED_FILE' ? '#f59e0b' : '#ef4444' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {error.code === 'RESTRICTED_FILE' ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                )}
              </svg>
            </div>
            <h3 className="text-lg font-bold mb-2" style={{ color: isDarkMode ? '#fff' : '#1e293b' }}>
              {error.code === 'RESTRICTED_FILE' ? 'Access Required' : 'Cannot Load'}
            </h3>
            <p className="text-sm mb-4" style={{ color: isDarkMode ? '#94a3b8' : '#64748b' }}>{error.message}</p>

            {error.code === 'RESTRICTED_FILE' && (
              <div className="space-y-2">
                {accessRequested ? (
                  <div className="rounded-lg p-3 text-sm" style={{ backgroundColor: 'rgba(20, 184, 166, 0.2)', color: '#14b8a6' }}>
                    <p className="font-medium">✓ Request Sent</p>
                  </div>
                ) : (
                  <button onClick={handleRequestAccess} disabled={requestingAccess}
                    className="w-full px-4 py-2.5 rounded-lg font-medium disabled:opacity-50"
                    style={{ backgroundColor: '#14b8a6', color: '#fff' }}>
                    {requestingAccess ? 'Sending...' : 'Request Access'}
                  </button>
                )}
              </div>
            )}
            <button onClick={onClose} className="mt-3 w-full px-4 py-2 rounded-lg"
              style={{ backgroundColor: isDarkMode ? '#334155' : '#e2e8f0', color: isDarkMode ? '#cbd5e1' : '#475569' }}>
              Go Back
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 relative">
          {/* Current Page Display */}
          {currentPageData && (
            <div 
              className="absolute inset-0 overflow-auto flex justify-center"
              style={{ 
                paddingTop: headerHeight + 8,
                paddingBottom: footerHeight + 8,
                paddingLeft: isMobile ? 8 : 16,
                paddingRight: isMobile ? 8 : 16,
              }}
              onClick={isMobile ? () => setShowControls(!showControls) : undefined}
            >
              <div 
                className="relative rounded shadow-lg overflow-hidden"
                style={{ 
                  width: currentPageData.width, 
                  height: currentPageData.height, 
                  maxWidth: '100%',
                  backgroundColor: '#fff' 
                }}
              >
                <img 
                  src={currentPageData.dataUrl} 
                  alt={`Page ${currentPage}`} 
                  className="w-full h-full object-contain"
                  draggable={false} 
                  onContextMenu={e => e.preventDefault()} 
                />
              </div>
            </div>
          )}

          {/* Tldraw Drawing Layer */}
          {!error && !loading && store && drawingEnabled && currentPageData && (
            <div 
              className="absolute inset-0 overflow-hidden"
              style={{ 
                zIndex: 35,
                pointerEvents: 'none',
              }}
            >
              <style jsx global>{`
                .pdf-tldraw-container .tl-container {
                  background: transparent !important;
                }
                .pdf-tldraw-container .tl-background {
                  background: transparent !important;
                }
                .pdf-tldraw-container canvas {
                  background: transparent !important;
                }
                
                /* Toolbar styling */
                .pdf-tldraw-container .tlui-toolbar,
                .pdf-tldraw-container .tl-toolbar,
                .pdf-tldraw-container [data-testid="tools.panel"] {
                  position: fixed !important;
                  top: ${headerHeight + 4}px !important;
                  left: 50% !important;
                  transform: translateX(-50%) !important;
                  z-index: 100 !important;
                  border-radius: 12px !important;
                  padding: 6px 8px !important;
                  gap: 4px !important;
                  pointer-events: auto !important;
                  ${isDarkMode ? `
                    background: rgba(255, 255, 255, 0.95) !important;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4) !important;
                  ` : `
                    background: rgba(15, 23, 42, 0.95) !important;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3) !important;
                  `}
                }
                .pdf-tldraw-container .tlui-toolbar button,
                .pdf-tldraw-container .tl-toolbar button,
                .pdf-tldraw-container [data-testid="tools.panel"] button {
                  ${isDarkMode ? `color: #1e293b !important;` : `color: #fff !important;`}
                  pointer-events: auto !important;
                }
                .pdf-tldraw-container .tlui-toolbar button:hover,
                .pdf-tldraw-container .tl-toolbar button:hover,
                .pdf-tldraw-container [data-testid="tools.panel"] button:hover {
                  background: ${isDarkMode ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)'} !important;
                }
                .pdf-tldraw-container .tlui-toolbar button[data-state="selected"],
                .pdf-tldraw-container .tl-toolbar button[data-selected="true"],
                .pdf-tldraw-container [data-testid="tools.panel"] button[data-selected="true"] {
                  background: ${isDarkMode ? 'rgba(20, 184, 166, 0.3)' : 'rgba(20, 184, 166, 0.4)'} !important;
                }
                
                /* Actions menu */
                .pdf-tldraw-container .tlui-actions-menu,
                .pdf-tldraw-container .tl-actions-menu,
                .pdf-tldraw-container [data-testid="actions.panel"] {
                  position: fixed !important;
                  bottom: ${footerHeight + 16}px !important;
                  left: 50% !important;
                  transform: translateX(-50%) !important;
                  z-index: 100 !important;
                  pointer-events: auto !important;
                  ${isDarkMode ? `background: rgba(255, 255, 255, 0.95) !important;` : `background: rgba(15, 23, 42, 0.95) !important;`}
                  border-radius: 12px !important;
                }
                
                /* Quick actions */
                .pdf-tldraw-container .tlui-quick-actions {
                  position: fixed !important;
                  bottom: ${footerHeight + 16}px !important;
                  right: 16px !important;
                  z-index: 100 !important;
                  pointer-events: auto !important;
                  ${isDarkMode ? `background: rgba(255, 255, 255, 0.95) !important;` : `background: rgba(15, 23, 42, 0.95) !important;`}
                  border-radius: 12px !important;
                }
                
                .pdf-tldraw-container .tl-shape-view {
                  pointer-events: auto !important;
                }
                
                .pdf-tldraw-container .tl-canvas {
                  pointer-events: auto !important;
                }
                
                @media (max-width: 640px) {
                  .pdf-tldraw-container .tlui-toolbar,
                  .pdf-tldraw-container .tl-toolbar,
                  .pdf-tldraw-container [data-testid="tools.panel"] {
                    top: 52px !important;
                    max-width: calc(100vw - 16px) !important;
                  }
                }
              `}</style>
              <div 
                className="pdf-tldraw-container absolute inset-0"
                style={{ 
                  top: headerHeight,
                  bottom: footerHeight,
                  pointerEvents: 'auto',
                }}
              >
                <Tldraw 
                  key={`page-${currentPage}`}
                  store={store} 
                  onMount={handleEditorMount}
                  hideUi={false}
                  components={{ 
                    PageBackground: () => null,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 backdrop-blur-sm border-t px-3 py-1.5 text-center z-50"
        style={{ 
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.9)',
          borderColor: isDarkMode ? 'rgba(51, 65, 85, 0.5)' : 'rgba(226, 232, 240, 0.8)'
        }}>
        <p className="text-xs" style={{ color: isDarkMode ? '#64748b' : '#94a3b8' }}>
          {error ? 'Contact admin for access' : 
           totalPages > 1 ? `Page ${currentPage} of ${totalPages} • ${drawingEnabled ? 'Select tool to draw' : 'Drawing OFF'}` :
           drawingEnabled ? 'Select a tool above to draw' : 'Drawing OFF'}
        </p>
      </div>
    </div>
  )
}

// Load PDF.js
async function loadPdfJs(): Promise<typeof window.pdfjsLib | null> {
  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
    return window.pdfjsLib
  }
  return new Promise((resolve) => {
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
    script.async = true
    script.onload = () => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
        resolve(window.pdfjsLib)
      } else resolve(null)
    }
    script.onerror = () => resolve(null)
    document.head.appendChild(script)
  })
}

declare global {
  interface Window {
    pdfjsLib: {
      getDocument: (params: { data: ArrayBuffer } | { url: string }) => { promise: Promise<PDFDocumentProxy> }
      GlobalWorkerOptions: { workerSrc: string }
    }
  }
}

type PDFDocumentProxy = { numPages: number; getPage: (num: number) => Promise<PDFPageProxy> }
type PDFPageProxy = {
  getViewport: (options: { scale: number }) => { width: number; height: number }
  render: (params: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }) => { promise: Promise<void> }
}
