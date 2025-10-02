/**
 * Secure Print Utility
 * Prevents XSS attacks when generating printable content
 */

/**
 * Safely extracts text content from a DOM element without HTML tags
 * This prevents XSS attacks by stripping all HTML and only keeping text
 */
export const extractSecureTextContent = (element) => {
  if (!element) return '';
  
  // Use textContent instead of innerHTML to prevent XSS
  return element.textContent || element.innerText || '';
};

/**
 * Sanitizes user data for safe inclusion in generated documents
 * Escapes HTML entities to prevent XSS injection
 */
export const sanitizeUserData = (data) => {
  if (typeof data !== 'string') return String(data || '');
  
  return data
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Secure print function that safely generates printable content
 */
export const securePrint = (options) => {
  const {
    title = 'Report',
    userName = '',
    userRole = '',
    userEmail = '',
    contentRef,
    additionalInfo = []
  } = options;
  
  const w = window.open('', '_blank');
  if (!w) {
    console.warn('Pop-up blocked. Cannot open print window.');
    return false;
  }
  
  try {
    // Safely extract only text content (no HTML)
    const textContent = extractSecureTextContent(contentRef?.current);
    
    // Sanitize all user inputs
    const safeTitle = sanitizeUserData(title);
    const safeUserName = sanitizeUserData(userName);
    const safeUserRole = sanitizeUserData(userRole);
    const safeUserEmail = sanitizeUserData(userEmail);
    
    // Build safe HTML document
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${safeTitle}</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            padding: 20px; 
            line-height: 1.6;
            color: #333;
          }
          .header { 
            border-bottom: 2px solid #ddd; 
            padding-bottom: 10px; 
            margin-bottom: 20px; 
          }
          .user-info { 
            background: #f9f9f9; 
            padding: 15px; 
            border-radius: 5px; 
            margin-bottom: 20px; 
          }
          .content { 
            white-space: pre-wrap; 
            font-family: monospace; 
            background: #f8f8f8; 
            padding: 15px; 
            border-radius: 5px; 
          }
          button, nav, header, footer, .no-print { 
            display: none !important; 
          }
          @media print {
            body { margin: 0; }
            .header { page-break-after: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${safeTitle}</h1>
          <p>Generated on: ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="user-info">
          ${safeUserName ? `<p><strong>Name:</strong> ${safeUserName}</p>` : ''}
          ${safeUserRole ? `<p><strong>Role:</strong> ${safeUserRole}</p>` : ''}
          ${safeUserEmail ? `<p><strong>Email:</strong> ${safeUserEmail}</p>` : ''}
          ${additionalInfo.map(info => 
            `<p><strong>${sanitizeUserData(info.label)}:</strong> ${sanitizeUserData(info.value)}</p>`
          ).join('')}
        </div>
        
        <div class="content">
          ${textContent}
        </div>
        
        <div style="margin-top: 30px; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 10px;">
          <p>This report was generated securely by WeCare Platform</p>
        </div>
      </body>
      </html>
    `;
    
    w.document.write(htmlContent);
    w.document.close();
    w.focus();
    
    // Small delay to ensure content is loaded before printing
    setTimeout(() => {
      w.print();
      w.close();
    }, 250);
    
    return true;
    
  } catch (error) {
    console.error('Secure print error:', error);
    w.close();
    return false;
  }
};

/**
 * Secure CSV export function with proper escaping
 */
export const secureCSVExport = (data, filename = 'export.csv') => {
  try {
    // Ensure data is array of arrays
    if (!Array.isArray(data) || data.length === 0) {
      console.warn('Invalid CSV data provided');
      return false;
    }
    
    // Properly escape CSV fields
    const escapeCsvField = (field) => {
      const str = String(field || '');
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    
    // Build CSV content
    const csvContent = data
      .map(row => row.map(escapeCsvField).join(','))
      .join('\n');
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    URL.revokeObjectURL(url);
    
    return true;
    
  } catch (error) {
    console.error('Secure CSV export error:', error);
    return false;
  }
};