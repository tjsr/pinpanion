import QRCode from 'react-qr-code';
import { QR_CODE_SIZE } from '../globals';

export type FilterQRCodeProps = {
};
export const FilterQRCode = ({}: FilterQRCodeProps): JSX.Element => {
  const generateQrCode = (): string => {
    return window.location.href;
  };

  return (
    <div className="selectionQrCode">
      <div className="qrQuietZone">
        <QRCode
          size={QR_CODE_SIZE}
          className="selectionQrCode"
          value={generateQrCode()}
          viewBox={`0 0 ${QR_CODE_SIZE} ${QR_CODE_SIZE}`}
        />
      </div>
      <div>
        Use this QR code to allow others to scan, which will let them browse
        this list of selected pins.
      </div>
    </div>
  );
};
