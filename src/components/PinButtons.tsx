import '../css/buttons.css';

type PinListButtonsProps = {
  availableCount: number;
  wantedCount: number;
  pinId: number;
  setPinWanted: (pinId: number) => void;
  setPinAvailable: (pinId: number) => void;
};

export const PinListButtons = ({
  availableCount,
  wantedCount,
  pinId,
  setPinWanted,
  setPinAvailable,
}: PinListButtonsProps): JSX.Element => {
  const isAvailable: boolean = availableCount > 0;
  const availableClasses: string = isAvailable ? 'availableButton' : 'availableButton pinNotAvailable';

  const isWanted: boolean = wantedCount > 0;
  const wantedClasses: string = isWanted ? 'wantedButton' : 'wantedButton pinNotWanted';
  return (
    <div className="listButtons">
      <button
        className={availableClasses}
        id={`available_${pinId}`}
        value={pinId}
        onClick={() => {
          setPinAvailable(pinId);
        }}
      >
        A
      </button>
      <button
        className={wantedClasses}
        id={`wanted_${pinId}`}
        value={pinId}
        onClick={() => {
          setPinWanted(pinId);
        }}
      >
        W
      </button>
    </div>
  );
};
