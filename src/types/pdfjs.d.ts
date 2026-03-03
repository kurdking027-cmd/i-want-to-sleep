// PDF.js types for CDN-loaded library
declare global {
  interface Window {
    pdfjsLib: {
      getDocument: (params: { url?: string; data?: ArrayBuffer; withCredentials?: boolean }) => {
        promise: Promise<PDFDocumentProxy>
      }
      GlobalWorkerOptions: {
        workerSrc: string
      }
    }
  }
}

interface PDFDocumentProxy {
  numPages: number
  getPage: (pageNumber: number) => Promise<PDFPageProxy>
}

interface PDFPageProxy {
  getViewport: (options: { scale: number }) => {
    width: number
    height: number
  }
  render: (params: {
    canvasContext: CanvasRenderingContext2D
    viewport: { width: number; height: number }
  }) => {
    promise: Promise<void>
  }
}

export {}
