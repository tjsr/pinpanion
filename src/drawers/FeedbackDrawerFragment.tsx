import '../css/pins.css';
import '../css/App.css';

import { DrawerFragment } from '../components/DrawerFragment';
import React from 'react';

type FeedbackDrawerFragmentProps = {};

export const FeedbackDrawerFragment = ({}: FeedbackDrawerFragmentProps): JSX.Element => {
  return (
    <DrawerFragment drawerId="feedback" label="Feedback">
      <div className="feedback">
        <p>
          Pinpanion is a very quick project put together in about 10 days prior to PAX. It is intended to become an
          offline-enabled tool to best enable in-person convention pin trading and help build community interactions and
          friendships via pin trading.
        </p>
        <p>
          I would appreciate and invite any and all feedback about your use of the app, what you found confusing, or how
          you would like to use it or enable use of it - for now, I'd ask you to email feedback, and any screenshots if
          they can help, to <a href="mailto:tim@tjsr.id.au">tim@tjsr.id.au</a>.
        </p>
        <p>
          This app is completely open-source and written in Typescript using React and MUI. The source code can be found
          at{' '}
          <a href="https://bitbucket.org/tjsrowe/pinnysets/src/main/">
            https://bitbucket.org/tjsrowe/pinnysets/src/main/
          </a>
          .
        </p>
        <p>
          For more information, including known bugs, please consult the readme in the above project repo link. Or, send
          feedback.
        </p>
      </div>
    </DrawerFragment>
  );
};
