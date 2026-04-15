import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';

const SnackbarContext = createContext(null);

const Alert = React.forwardRef(function Alert(props, ref) {
    return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

export const SnackbarProvider = ({ children }) => {
    const [open, setOpen] = useState(false);
    const [message, setMessage] = useState('');
    const [severity, setSeverity] = useState('success');
    const [duration, setDuration] = useState(6000);

    const handleClose = useCallback((event, reason) => {
        if (reason === 'clickaway') return;
        setOpen(false);
    }, []);

    const showSnackbar = useCallback((msg, severity = 'success', durationMs = 6000) => {
        if (!msg) return;
        setMessage(msg);
        setSeverity(severity);
        setDuration(durationMs);
        setOpen(true);
    }, []);

    const providerValue = useMemo(() => showSnackbar, [showSnackbar]);

    return (
        <SnackbarContext.Provider value={providerValue}>
            {children}
            <Snackbar open={open} autoHideDuration={duration} onClose={handleClose}>
                <Alert onClose={handleClose} severity={severity} sx={{ width: '100%' }}>
                    {message}
                </Alert>
            </Snackbar>
        </SnackbarContext.Provider>
    );
};

export const useSnackbar = () => {
    return useContext(SnackbarContext);
};
