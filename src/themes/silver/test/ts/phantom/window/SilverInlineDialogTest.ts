import { Assertions, Chain, GeneralSteps, Mouse, Pipeline, UiFinder, Waiter, Step, FocusTools, Logger } from '@ephox/agar';
import { UnitTest } from '@ephox/bedrock';
import { Body, Element } from '@ephox/sugar';
import WindowManager from 'tinymce/themes/silver/ui/dialog/WindowManager';

import { setupDemo } from '../../../../demo/ts/components/DemoHelpers';
import { TestStore, GuiSetup } from '../../module/AlloyTestUtils';
import { document } from '@ephox/dom-globals';
import { Cell } from '@ephox/katamari';
import { Types } from '@ephox/bridge';
import { Channels } from '@ephox/alloy';

UnitTest.asynctest('WindowManager:inline-dialog Test', (success, failure) => {
  const helpers = setupDemo();
  const windowManager = WindowManager.setup(helpers.extras);

  const store = TestStore();

  const currentApi = Cell<Types.Dialog.DialogInstanceApi<any>>({ } as any);

  const sTestOpen = (params) => Chain.asStep({ }, [
    Chain.mapper((_) => {
      const dialogSpec = {
        title: 'Silver Test Inline (Toolbar) Dialog',
        body: {
          type: 'panel',
          items: [
            {
              type: 'input',
              name: 'fred',
              label: 'Freds Input'
            },
          ]
        },
        buttons: [
          {
            type: 'custom',
            name: 'barny',
            text: 'Barny Text',
            align: 'start',
            primary: true
          },
        ],
        initialData: {
          fred: 'said hello pebbles'
        },
        onSubmit: store.adder('onSubmit'),
        onClose: store.adder('onClose'),
        onCancel: store.adder('onCancel'),
        onChange: store.adder('onChange'),
        onAction: store.adder('onAction')
      };
      return windowManager.open(dialogSpec, params);
    }),

    Chain.op((dialogApi) => {
      Assertions.assertEq('Initial data', {
        fred: 'said hello pebbles'
      }, dialogApi.getData());

      currentApi.set(dialogApi);
    })
  ]);

  const sTestClose = GeneralSteps.sequence([
    Mouse.sClickOn(Body.body(), '[aria-label="Close"]'),
    UiFinder.sNotExists(Body.body(), '[role="dialog"]')
  ]);

  Pipeline.async({}, [
    GuiSetup.mAddStyles(Element.fromDom(document), [
      '.tox-dialog { background: white; border: 2px solid black; padding: 1em; margin: 1em; }'
    ]),
    sTestOpen({ inline: 'magic' }),
    FocusTools.sTryOnSelector(
      'Focus should start on the input',
      Element.fromDom(document),
      'input'
    ),
    Step.sync(() => {
      currentApi.get().disable('barny');
    }),
    sTestClose,
    Waiter.sTryUntil(
      'Waiting for all dialog events when closing',
      store.sAssertEq('Checking stuff', [
        'onCancel',
        'onClose'
      ]),
      100,
      3000
    ),

    store.sClear,

    sTestOpen({ inline: 'toolbar' }),
    FocusTools.sTryOnSelector(
      'Focus should start on the input',
      Element.fromDom(document),
      'input'
    ),
    Step.sync(() => {
      helpers.uiMothership.broadcastOn([ Channels.dismissPopups() ], {
        target: Body.body()
      });
    }),
    Waiter.sTryUntil(
      'Waiting for all dialog events when closing via dismiss',
      store.sAssertEq('Checking stuff', [
        'onCancel',
        'closeWindow',
        'onClose'
      ]),
      100,
      3000
    ),
    Logger.t(
      'After broadcasting dismiss, dialog should be removed',
      UiFinder.sNotExists(Body.body(), '[role="dialog"]')
    ),
    GuiSetup.mRemoveStyles
  ], () => {
    helpers.destroy();
    success();
  }, failure);
});