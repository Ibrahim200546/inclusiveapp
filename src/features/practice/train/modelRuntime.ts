import { createTrainModel } from './model';
import { createModelTransport } from './modelTransport';

export const trainModel = createTrainModel(createModelTransport(window));
if (import.meta.hot) import.meta.hot.dispose(() => trainModel.dispose());
