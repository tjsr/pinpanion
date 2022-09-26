type PinListButtonsProps = {
  isSelected: boolean;
  pinId: number;
  addPin: (pinId: number) => void;
  removePin: (pinId: number) => void;
  togglePinInSet: (pinId: number) => boolean;
};

export const PinListButtons = ({
  isSelected,
  pinId,
  addPin,
  removePin,
}: PinListButtonsProps): JSX.Element => {
  return (
    <div className="listButtons">
      <button
        className="addButton"
        disabled={isSelected}
        id={`add_${pinId}`}
        value={pinId}
        onClick={() => {
          addPin(pinId);
        }}
      >
        +
      </button>
      <button
        className="removeButton"
        disabled={!isSelected}
        id={`remove_${pinId}`}
        value={pinId}
        onClick={() => {
          removePin(pinId);
        }}
      >
        -
      </button>
    </div>
  );
};
