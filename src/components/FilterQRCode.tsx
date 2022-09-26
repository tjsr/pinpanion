import { PinListFilter } from '../types';
import QRCode from 'react-qr-code';
import { QR_CODE_SIZE } from '../globals';
import { filterStringToIds } from '../listutils';

export type FilterQRCodeProps = {
  filter: PinListFilter;
};
export const FilterQRCode = ({ filter }: FilterQRCodeProps): JSX.Element => {
  const generateQrCode = (): string => {
    return filter?.selectedPinsList ?
      filterStringToIds(filter?.selectedPinsList).join(',') :
      '';
  };

  return (
    <div className="filterQrCode">
      <div className="qrQuietZone">
        <QRCode
          size={QR_CODE_SIZE}
          className="filterQrCode"
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
