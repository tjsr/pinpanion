import '../css/buttons.css';

import React from 'react';

type PinListButtonsProps = {
  availableCount: number;
  wantedCount: number;
  pinId: number;
  isPinSet: boolean;
  setPinWanted: (pinId: number, isPinSet: boolean) => void;
  setPinAvailable: (pinId: number, isPinSet: boolean) => void;
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
    const { availableCount, wantedCount, pinId, isPinSet, setPinWanted, setPinAvailable } = this.props;

    const isAvailable: boolean = availableCount > 0;
    const availableClasses: string = isAvailable ? 'availableButton' : 'availableButton pinNotAvailable';

    const isWanted: boolean = wantedCount > 0;
    const wantedClasses: string = isWanted ? 'wantedButton' : 'wantedButton pinNotWanted';
    const availableButtonId = 'available' + (isPinSet ? '_set_' : '_') + pinId;
    const wantedButtonId = 'wanted' + (isPinSet ? '_set_' : '_') + pinId;

    return (
      <div className="listButtons">
        <button
          className={availableClasses}
          id={availableButtonId}
          value={pinId}
          onClick={() => {
            setPinAvailable(pinId, isPinSet);
          }}
        >
          A
        </button>
        <button
          className={wantedClasses}
          id={wantedButtonId}
          value={pinId}
          onClick={() => {
            setPinWanted(pinId, isPinSet);
          }}
        >
          W
        </button>
      </div>
    );
  }
}
