// PDF generation with jsPDF library

import jsPDF from 'jspdf';

export interface ExportColumn {
  key: string;
  label: string;
  format?: (value: any, row?: any) => string;
}

export interface ExportOptions {
  filename?: string;
  title?: string;
  includeTimestamp?: boolean;
  logoUrl?: string;
}

export class ExportUtils {
  /**
   * Export data to CSV format
   */
  static exportToCSV<T>(
    data: T[],
    columns: ExportColumn[],
    options: ExportOptions = {}
  ): void {
    const {
      filename = 'export',
      includeTimestamp = true
    } = options;

    // Create CSV header
    const headers = columns.map(col => col.label);

    // Create CSV rows
    const rows = data.map(item =>
      columns.map(col => {
        const value = (item as any)[col.key];
        return col.format ? col.format(value, item) : String(value || '');
      })
    );

    // Combine headers and rows
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n');

    // Create and download file
    this.downloadFile(
      csvContent,
      `${filename}${includeTimestamp ? `_${this.getTimestamp()}` : ''}.csv`,
      'text/csv'
    );
  }

  /**
   * Export data to PDF format (using jsPDF library)
   */
  static async exportToPDF<T>(
    data: T[],
    columns: ExportColumn[],
    options: ExportOptions = {}
  ): Promise<void> {
  const {
    filename = 'export',
    title = 'Data Export',
    includeTimestamp = true,
    logoUrl = '/images/partners/MDRRMO.png' // <-- add your logo path here
  } = options;

  const doc = new jsPDF();

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const headerHeight = 35; // Reduced header height for tighter layout
  let currentY = headerHeight;

  // ===== HEADER =====
  if (includeTimestamp) {
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(80, 80, 80);
  const now = new Date();
  const monthName = now.toLocaleString('default', { month: 'long' });
  const day = now.getDate();
  const year = now.getFullYear();
  let hours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  const hourStr = hours.toString().padStart(2, '0');
  const timestampText = `Generated on: ${monthName} ${day}, ${year} ${hourStr}:${minutes}:${seconds} ${ampm}`;
  doc.text(timestampText, margin, 15); // top-left
  }

  // Add logo in header (top-right)
  if (logoUrl) {
    try {
      if (logoUrl.startsWith('data:image')) {
        // If already base64, use directly
        doc.addImage(logoUrl, 'PNG', pageWidth - margin - 25, 8, 25, 15);
      } else {
        // For URL paths, create an image element and load it
        const img = new Image();
        img.crossOrigin = 'Anonymous';

        // Create a promise to handle image loading
        const loadImagePromise = new Promise<void>((resolve, reject) => {
          img.onload = () => {
            try {
              // Convert to canvas and get base64 with higher quality
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              if (!ctx) {
                reject(new Error('Canvas context not available'));
                return;
              }

              // Use much higher resolution for crystal clear quality
              const scaleFactor = 4; // Render at 4x resolution for ultra quality
              const maxWidth = 40; // Larger max size for better quality
              const maxHeight = 24;
              const aspectRatio = img.width / img.height;

              let drawWidth = maxWidth;
              let drawHeight = maxHeight;

              if (img.width > maxWidth || img.height > maxHeight) {
                if (aspectRatio > maxWidth / maxHeight) {
                  drawHeight = maxWidth / aspectRatio;
                } else {
                  drawWidth = maxHeight * aspectRatio;
                }
              }

              // Set canvas to ultra-high resolution
              canvas.width = Math.max(img.width, drawWidth * scaleFactor);
              canvas.height = Math.max(img.height, drawHeight * scaleFactor);

              // Enable highest quality image smoothing
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';

              // Clear canvas with white background
              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(0, 0, canvas.width, canvas.height);

              // Calculate scaling to fit image properly while maintaining aspect ratio
              const scaleX = canvas.width / img.width;
              const scaleY = canvas.height / img.height;
              const scale = Math.min(scaleX, scaleY);

              // Center the image
              const x = (canvas.width - img.width * scale) / 2;
              const y = (canvas.height - img.height * scale) / 2;

              // Draw the image with high quality scaling
              ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

              // Get ultra-high-quality base64
              const base64 = canvas.toDataURL('image/png', 1.0); // Maximum quality
              doc.addImage(base64, 'PNG', pageWidth - margin - drawWidth, 8, drawWidth, drawHeight);
              resolve();
            } catch (error) {
              reject(error);
            }
          };

          img.onerror = () => {
            reject(new Error(`Failed to load image: ${logoUrl}`));
          };

          img.src = logoUrl;
        });

        // Wait for image to load (this is synchronous in the PDF generation context)
        // Note: In practice, you might want to preload images before calling exportToPDF
        try {
          await loadImagePromise;
        } catch (imageError) {
          console.warn('Failed to load logo, using text placeholder:', imageError);
          // Draw a placeholder text logo instead
          doc.setFontSize(10);
          doc.setFont(undefined, 'bold');
          doc.setTextColor(100, 100, 100);
          doc.text('MDRRMO', pageWidth - margin - 30, 15);
        }
      }
    } catch (error) {
      console.warn('Failed to add logo to PDF:', error);
      // Continue without logo if there's an error
    }
  }

  // Title in header (centered)
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(title, pageWidth / 2, 36, { align: 'center' }); // Move title lower for more separation

  // ===== TABLE LOGIC =====
    // Compressed table: minimal spacing, smaller font, tight layout
    const headers = columns.map(col => col.label);
    const rows = data.map(item =>
      columns.map(col => {
        const value = (item as any)[col.key];
        return col.format ? col.format(value, item) : String(value || '');
      })
    );

    const availableWidth = pageWidth - 2 * margin;
    const minColWidth = 15; // Even smaller minimum column width
    const maxColWidth = 40; // Smaller maximum column width

    // Calculate column widths for compressed layout
    const colWidths: number[] = [];
    headers.forEach((header, index) => {
      const headerWidth = doc.getTextWidth(header) + 6; // Less padding
      const sampleRows = rows.length > 50 ? rows.slice(0, 50) : rows;
      const maxDataWidth = Math.max(
        ...sampleRows.map(row => {
          const cellText = String(row[index] || '');
          if (!cellText || cellText === 'undefined' || cellText === 'null') return 0;
          const lines = doc.splitTextToSize(cellText, maxColWidth - 6);
          if (Array.isArray(lines)) {
            return Math.max(...lines.map((line: string) => doc.getTextWidth(line))) + 6;
          } else {
            return doc.getTextWidth(lines) + 6;
          }
        })
      );
      const optimalWidth = Math.max(headerWidth, maxDataWidth, minColWidth);
      colWidths.push(Math.min(optimalWidth, maxColWidth));
    });

    // Ensure total width doesn't exceed available width
    const totalWidth = colWidths.reduce((sum, width) => sum + width, 0);
    if (totalWidth > availableWidth) {
      const scaleFactor = availableWidth / totalWidth;
      colWidths.forEach((width, index) => {
        colWidths[index] = Math.max(width * scaleFactor, minColWidth);
      });
    }

    // Draw table header (compressed)
    const drawTableHeader = (yPos: number) => {
      const headerHeight = 6; // Minimal header height
      doc.setFillColor(230, 230, 230);
      doc.rect(margin, yPos - 4, colWidths.reduce((a, b) => a + b, 0), headerHeight, 'F');
      doc.setLineWidth(0.10);
      doc.setDrawColor(120, 120, 120);
      doc.rect(margin, yPos - 4, colWidths.reduce((a, b) => a + b, 0), headerHeight);
      let cellX = margin;
      for (let i = 0; i < colWidths.length; i++) {
        doc.line(cellX, yPos - 4, cellX, yPos - 4 + headerHeight);
        cellX += colWidths[i];
      }
      doc.line(cellX, yPos - 4, cellX, yPos - 4 + headerHeight);
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(6); // Smaller header font
      let xPos = margin;
      headers.forEach((header, index) => {
        const colWidth = colWidths[index];
        const headerText = String(header);
        const maxTextWidth = colWidth - 2;
        const lines = doc.splitTextToSize(headerText, maxTextWidth);
        if (Array.isArray(lines)) {
          lines.forEach((line, lineIndex) => {
            doc.text(line, xPos + 1, yPos + lineIndex * 3.5);
          });
        } else {
          doc.text(headerText, xPos + 1, yPos);
        }
        xPos += colWidth;
      });
      return yPos + 5;
    };

  currentY += 12; // More space before table to match new title position
  currentY = drawTableHeader(currentY);

    doc.setFont(undefined, 'normal');
    doc.setFontSize(6); // Smaller row font

    let pageNumber = 1;
    rows.forEach((row, rowIndex) => {
      let xPos = margin;
      let maxCellHeight = 7; // Minimal row height
      const cellLines: string[][] = [];
      row.forEach((_, index) => {
        const colWidth = colWidths[index];
        const cellText = String(row[index] || '');
        const lines = doc.splitTextToSize(cellText, colWidth - 4); // Minimal padding
        cellLines.push(Array.isArray(lines) ? lines : [lines]);
        const cellHeight = (Array.isArray(lines) ? lines.length : 1) * 3.5 + 2;
        maxCellHeight = Math.max(maxCellHeight, cellHeight);
      });
      if (currentY + maxCellHeight > pageHeight - margin - 10) {
        doc.setFontSize(6);
        doc.setTextColor(100, 100, 100);
        doc.text(`Page ${pageNumber}`, pageWidth / 2, pageHeight - 7, { align: 'center' });
        doc.addPage();
        pageNumber++;
        currentY = headerHeight + 8; // Add extra space for new title position
        currentY = drawTableHeader(currentY);
        doc.setFontSize(6);
      }
      if (rowIndex % 2 === 1) {
        doc.setFillColor(245, 245, 245);
        doc.rect(margin, currentY - 2, colWidths.reduce((a, b) => a + b, 0), maxCellHeight, 'F');
      }
      doc.setLineWidth(0.10);
      doc.setDrawColor(180, 180, 180);
      doc.rect(margin, currentY - 2, colWidths.reduce((a, b) => a + b, 0), maxCellHeight);
      let cellX = margin;
      for (let i = 0; i < colWidths.length; i++) {
        doc.line(cellX, currentY - 2, cellX, currentY - 2 + maxCellHeight);
        cellX += colWidths[i];
      }
      doc.line(cellX, currentY - 2, cellX, currentY - 2 + maxCellHeight);
      xPos = margin;
      cellLines.forEach((lines, index) => {
        const colWidth = colWidths[index];
        const totalTextHeight = lines.length * 3.5;
        const startY = currentY + ((maxCellHeight - totalTextHeight) / 2) + 0.5;
        lines.forEach((line, lineIndex) => {
          let clippedLine = line;
          if (doc.getTextWidth(line) > colWidth - 4) {
            clippedLine = doc.splitTextToSize(line, colWidth - 4)[0];
          }
          doc.text(clippedLine, xPos + 2, startY + lineIndex * 3.5, {
            maxWidth: colWidth - 4
          });
        });
        xPos += colWidth;
      });
      currentY += maxCellHeight;
    });

  // ...compressed table logic already present above...

  // Summary box
  currentY += 10;
  doc.setFillColor(230, 230, 230);
  doc.rect(margin, currentY, availableWidth, 12, 'F');
  doc.setDrawColor(0, 0, 0);
  doc.rect(margin, currentY, availableWidth, 12);
  doc.setFont(undefined, 'bold');
  doc.setFontSize(11);
  doc.text(`Total Records: ${data.length}`, pageWidth / 2, currentY + 8, { align: 'center' });

  // Final footer
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(`Page ${pageNumber}`, pageWidth / 2, pageHeight - 8, { align: 'center' });

  // Save
  doc.save(`${filename}${includeTimestamp ? `_${this.getTimestamp()}` : ''}.pdf`);
}

  /**
   * Export data to JSON format
   */
  static exportToJSON<T>(
    data: T[],
    options: ExportOptions = {}
  ): void {
    const {
      filename = 'export',
      includeTimestamp = true
    } = options;

    const jsonContent = JSON.stringify(data, null, 2);

    this.downloadFile(
      jsonContent,
      `${filename}${includeTimestamp ? `_${this.getTimestamp()}` : ''}.json`,
      'application/json'
    );
  }

  /**
   * Export data to Excel format (CSV with Excel-friendly formatting)
   */
  static exportToExcel<T>(
    data: T[],
    columns: ExportColumn[],
    options: ExportOptions = {}
  ): void {
    const {
      filename = 'export',
      includeTimestamp = true
    } = options;

    // Create Excel-friendly CSV
    const headers = columns.map(col => col.label);

    const rows = data.map(item =>
      columns.map(col => {
        const value = (item as any)[col.key];
        const formattedValue = col.format ? col.format(value, item) : String(value || '');
        // Escape commas and quotes for Excel
        return `"${formattedValue.replace(/"/g, '""')}"`;
      })
    );

    const csvContent = [headers, ...rows]
      .map(row => row.join(','))
      .join('\n');

    // Add BOM for Excel UTF-8 recognition
    const BOM = '\uFEFF';
    const excelContent = BOM + csvContent;

    this.downloadFile(
      excelContent,
      `${filename}${includeTimestamp ? `_${this.getTimestamp()}` : ''}.csv`,
      'application/vnd.ms-excel'
    );
  }

  /**
   * Generic file download utility
   */
  private static downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up
    URL.revokeObjectURL(url);
  }

  /**
   * Get formatted timestamp for filenames
   */
  private static getTimestamp(): string {
    const now = new Date();
    return now.getFullYear().toString() +
           (now.getMonth() + 1).toString().padStart(2, '0') +
           now.getDate().toString().padStart(2, '0') +
           '_' +
           now.getHours().toString().padStart(2, '0') +
           now.getMinutes().toString().padStart(2, '0') +
           now.getSeconds().toString().padStart(2, '0');
  }

  /**
   * Format date values
   */
  static formatDate = (date: string | Date): string => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString();
  };

  /**
   * Format datetime values
   */
  static formatDateTime = (date: string | Date): string => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleString();
  };

  /**
   * Format currency values
   */
  static formatCurrency = (amount: number): string => {
    if (amount == null) return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  /**
   * Format status values
   */
  static formatStatus = (status: number): string => {
    switch (status) {
      case 1: return 'Active';
      case 0: return 'Inactive';
      case -1: return 'Suspended';
      default: return 'Unknown';
    }
  };

  /**
   * Load image from URL and convert to base64 for PDF embedding
   */
  static async loadImageAsBase64(imageUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Use ultra-high quality settings for crystal clear image clarity
        const scaleFactor = 4;
        canvas.width = Math.max(img.width, img.width * scaleFactor);
        canvas.height = Math.max(img.height, img.height * scaleFactor);

        // Enable highest quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Clear canvas with white background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Calculate scaling to fit image properly while maintaining aspect ratio
        const scaleX = canvas.width / img.width;
        const scaleY = canvas.height / img.height;
        const scale = Math.min(scaleX, scaleY);

        // Center the image
        const x = (canvas.width - img.width * scale) / 2;
        const y = (canvas.height - img.height * scale) / 2;

        // Draw the image with high quality scaling
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

        try {
          // Use maximum quality for base64 conversion
          const dataUrl = canvas.toDataURL('image/png', 1.0);
          resolve(dataUrl);
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error(`Failed to load image: ${imageUrl}`));
      };

      img.src = imageUrl;
    });
  }
}

export default ExportUtils;
