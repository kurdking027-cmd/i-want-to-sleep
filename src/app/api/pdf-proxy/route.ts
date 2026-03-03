import { NextRequest, NextResponse } from 'next/server'

// PDF Proxy API - Fetches PDF files from Google Drive server-side
// Renders as images to prevent downloading for view-only users

export async function GET(request: NextRequest) {
  try {
    const fileId = request.nextUrl.searchParams.get('fileId')
    const urlParam = request.nextUrl.searchParams.get('url')

    // Use fileId if provided, otherwise extract from URL
    let finalFileId = fileId
    
    if (!finalFileId && urlParam) {
      const match = urlParam.match(/\/d\/([a-zA-Z0-9_-]+)/)
      if (match) {
        finalFileId = match[1]
      }
    }

    if (!finalFileId) {
      return NextResponse.json({ 
        error: 'File ID required',
        code: 'MISSING_FILE_ID'
      }, { status: 400 })
    }

    // Try multiple Google Drive URL formats
    const urlsToTry = [
      `https://drive.google.com/uc?export=download&id=${finalFileId}`,
      `https://drive.usercontent.google.com/download?id=${finalFileId}&export=download&confirm=t`,
      `https://drive.google.com/uc?id=${finalFileId}&export=view`,
    ]

    for (const driveUrl of urlsToTry) {
      try {
        const response = await fetch(driveUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/pdf,application/octet-stream,*/*',
          },
          redirect: 'follow',
        })

        if (response.ok) {
          const contentType = response.headers.get('content-type') || ''
          
          // Check if we got a PDF or binary file
          if (
            contentType.includes('pdf') || 
            contentType.includes('octet-stream') || 
            contentType.includes('application/')
          ) {
            const arrayBuffer = await response.arrayBuffer()
            
            // Make sure we got actual data (not a redirect page)
            if (arrayBuffer.byteLength > 5000) {
              // Return the PDF data
              return new NextResponse(arrayBuffer, {
                headers: {
                  'Content-Type': 'application/pdf',
                  'Cache-Control': 'public, max-age=3600',
                }
              })
            }
          }
        }
      } catch {
        continue
      }
    }

    // If all methods failed - file is restricted
    return NextResponse.json({ 
      error: 'This file requires sharing permission',
      code: 'RESTRICTED_FILE',
      message: 'Please ask the file owner to share with "Anyone with the link can view"',
      fileId: finalFileId
    }, { status: 403 })

  } catch (error) {
    console.error('PDF proxy error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch file',
      code: 'FETCH_ERROR'
    }, { status: 500 })
  }
}
