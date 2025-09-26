import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useSnackbar } from '@/context/SnackbarProvider';
import { handleApiError } from '@/components/Utils';
import { useAuth } from '@/context/AuthProvider';

/**
 * Componente que renderiza un botón para descargar un PDF.
 * 
 * @param {{
 *   url: string,
 *   filename: string,
 *   buttonText?: string,
 *   className?: string
 * }} props 
 */
const PdfDownloader = ({ url, filename, buttonText = 'Descargar PDF', className = '', disabled = false }) => {
    const [loading, setLoading] = useState(false);
    const showSnackbar = useSnackbar();
    const { api } = useAuth();

    const handleDownload = async () => {
        setLoading(true);
        try {
            const response = await api().get(url, { responseType: 'blob' });
            const blobUrl = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(blobUrl);
        } catch (e) {
            showSnackbar(handleApiError(e, 'Error descargando el PDF'), 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button
            onClick={handleDownload}
            disabled={loading || disabled || !url || !filename}
            className={className}
        >
            {loading ? 'Generando archivo...' : buttonText}
        </Button>
    );
};

export default PdfDownloader;
