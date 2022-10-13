import '../css/buttons.css';

import React from 'react';

type PinListButtonsProps = {
  availableCount: number;
  wantedCount: number;
  pinId: number;
  setPinWanted: (pinId: number) => void;
  setPinAvailable: (pinId: number) => void;
};

export class PinListButtons extends React.Component<PinListButtonsProps> {
  state = {
    availableCount: 0,
    wantedCount: 0,
  };

  constructor(props: PinListButtonsProps) {
    super(props);

    this.cb = this.cb.bind(this);
  }

  cb() {
    return;
  }

  render() {
    const { availableCount, wantedCount, pinId, setPinWanted, setPinAvailable } = this.props;

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
  }
}
