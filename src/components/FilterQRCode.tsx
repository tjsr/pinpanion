import '../css/qr.css';
import './FilterQRCode.css';

import Alert from '@mui/material/Alert';
import CopyIcon from '@mui/icons-material/ContentCopy';
import IconButton from '@mui/material/IconButton';
import { PinSelectionList } from '../types';
import QRCode from 'react-qr-code';
import { QR_CODE_SIZE } from '../globals';
import Snackbar from '@mui/material/Snackbar';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import { createShareUrl } from '../utils/shareUrl';
import { useState } from 'react';

export type FilterQRCodeProps = {
  lanyard: PinSelectionList;
};

export const FilterQRCode = ({ lanyard }: FilterQRCodeProps): JSX.Element => {
  const [clipboardCopyDisplayed, setClipboardCopyDisplayed] = useState<boolean>(false);

  const AUTOHIDE_DURATION = 5000;
  const generatedQrCode:string = createShareUrl(lanyard, true);

  const copyLinkToClipboard = (): void => {
    navigator.clipboard.writeText(generatedQrCode);
    setClipboardCopyDisplayed(true);
  };

  const handleClose = (): void => {
    setClipboardCopyDisplayed(false);
    console.log('Alert closed');
  };

  if (lanyard.availableIds === undefined) {
    console.debug('Lanyard passed to FilterQRCode had no availableIds array.');
  }
  if (lanyard.wantedIds === undefined) {
    console.debug('Lanyard passed to FilterQRCode had no wantedIds array.');
  }

  return (
    <>
      <div className="selectionQrCode">
        <div className="qrQuietZone">
          <QRCode
            size={QR_CODE_SIZE}
            className="selectionQrCode"
            value={generatedQrCode}
            level="H"
            viewBox={`0 0 ${QR_CODE_SIZE} ${QR_CODE_SIZE}`}
          />
        </div>
        <div className="lanyardName">{lanyard.name}</div>
        <div className="qrDescription">
          Use this QR code to allow others to scan, which will let them browse this list of selected pins.
        </div>
      </div>
      <div className="shareLink">
        You can share this lanyard using the URL below.
        <div className="shareUrl">
          <TextField
            fullWidth
            label="URL to copy"
            disabled
            focused
            color="success"
            variant="filled"
            name="shareUrl"
            id="shareUrl"
            value={generatedQrCode}
            defaultValue={generatedQrCode}
          />
        </div>
        <div className="shareUrlCopyIcon">
          <Tooltip title="Copy to clipboard">
            <IconButton onClick={copyLinkToClipboard}>
              <CopyIcon color="primary" />
            </IconButton>
          </Tooltip>
        </div>
        <Snackbar open={clipboardCopyDisplayed} onClose={handleClose} autoHideDuration={AUTOHIDE_DURATION}>
          <Alert severity="success" sx={{ width: '100%' }}>
            URL copied to clipboard
          </Alert>
        </Snackbar>
      </div>
    </>
  );
};

