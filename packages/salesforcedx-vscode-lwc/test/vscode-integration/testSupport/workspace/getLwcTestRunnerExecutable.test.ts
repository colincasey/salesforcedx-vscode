/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { shared as lspCommon } from '@salesforce/lightning-lsp-common';
import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { assert, SinonSpy, SinonStub, spy, stub } from 'sinon';
import * as which from 'which';
import { nls } from '../../../../src/messages';
import { telemetryService } from '../../../../src/telemetry';
import {
  workspace,
  workspaceService
} from '../../../../src/testSupport/workspace';
import { workspaceUtils } from '@salesforce/salesforcedx-utils-vscode';

describe('getLwcTestRunnerExecutable Unit Tests', () => {
  let existsSyncStub: SinonStub<[fs.PathLike], boolean>;
  let whichSyncStub: SinonStub<[string], fs.PathLike>;
  let notificationStub: SinonSpy<
    [string, vscode.MessageOptions, ...vscode.MessageItem[]],
    Thenable<vscode.MessageItem | undefined>
  >;
  let telemetryStub: SinonStub<[string, string], void>;
  let getCurrentWorkspaceTypeStub: SinonStub<[], lspCommon.WorkspaceType>;
  let getRootWorkspacePathStub: SinonStub;

  beforeEach(() => {
    existsSyncStub = stub(fs, 'existsSync');
    notificationStub = spy(vscode.window, 'showErrorMessage');
    telemetryStub = stub(telemetryService, 'sendException');
    getCurrentWorkspaceTypeStub = stub(
      workspaceService,
      'getCurrentWorkspaceType'
    );
    getRootWorkspacePathStub = stub(workspaceUtils, 'getRootWorkspacePath');
  });

  afterEach(() => {
    existsSyncStub.restore();
    notificationStub.restore();
    telemetryStub.restore();
    getCurrentWorkspaceTypeStub.restore();
    getRootWorkspacePathStub.restore();
  });

  const root = /^win32/.test(process.platform) ? 'C:\\' : '/var';
  describe('SFDX Workspace', () => {
    const sfdxProjectPath = path.join(root, 'project', 'mockSfdxProject');

    beforeEach(() => {
      getCurrentWorkspaceTypeStub.returns(lspCommon.WorkspaceType.SFDX);
      getRootWorkspacePathStub.returns(sfdxProjectPath);
    });

    it('Should return LWC Test Runner Path when LWC Test Runner is installed and not display error message', () => {
      existsSyncStub.returns(true);
      const lwcTestRunnerExecutable = workspace.getLwcTestRunnerExecutable();
      expect(lwcTestRunnerExecutable).to.equal(
        path.join(sfdxProjectPath, 'node_modules', '.bin', 'lwc-jest')
      );
      assert.notCalled(notificationStub);
      assert.notCalled(telemetryStub);
    });

    it('Should display error message when LWC Jest Test Runner is not installed', () => {
      existsSyncStub.returns(false);
      workspace.getLwcTestRunnerExecutable();
      assert.calledOnce(notificationStub);
      // @ts-ignore
      assert.calledWith(
        notificationStub,
        nls.localize('no_lwc_jest_found_text')
      );
      assert.calledOnce(telemetryStub);
      assert.calledWith(
        telemetryStub,
        'lwc_test_no_lwc_jest_found',
        nls.localize('no_lwc_jest_found_text')
      );
    });
  });

  describe('Internal Dev Workspace', () => {
    const projectPath = path.join(root, 'project', 'mockProject');
    const mockLwcTestRunnerPath = path.join('/bin', 'lwc-test');
    beforeEach(() => {
      getCurrentWorkspaceTypeStub.returns(lspCommon.WorkspaceType.CORE_PARTIAL);
      whichSyncStub = stub(which, 'sync');
      whichSyncStub.returns(mockLwcTestRunnerPath);
      getRootWorkspacePathStub.returns(projectPath);
    });

    afterEach(() => {
      whichSyncStub.restore();
      getRootWorkspacePathStub.restore();
    });

    it('Should return LWC Test Runner Path when LWC Test Runner is installed and not display error message', () => {
      existsSyncStub.returns(true);
      const lwcTestRunnerExecutable = workspace.getLwcTestRunnerExecutable();
      expect(lwcTestRunnerExecutable).to.equal(mockLwcTestRunnerPath);
      assert.notCalled(notificationStub);
      assert.notCalled(telemetryStub);
    });

    it('Should display error message when LWC Jest Test Runner is not installed', () => {
      existsSyncStub.returns(false);
      workspace.getLwcTestRunnerExecutable();
      assert.calledOnce(notificationStub);
      // @ts-ignore
      assert.calledWith(
        notificationStub,
        nls.localize('no_lwc_testrunner_found_text')
      );
      assert.calledOnce(telemetryStub);
      assert.calledWith(
        telemetryStub,
        'lwc_test_no_lwc_testrunner_found',
        nls.localize('no_lwc_testrunner_found_text')
      );
    });
  });

  describe('Unsupported Workspace', () => {
    const projectPath = path.join(root, 'project', 'mockProject');

    beforeEach(() => {
      getRootWorkspacePathStub.returns(projectPath);
    });

    afterEach(() => {
      getRootWorkspacePathStub.restore();
    });

    getRootWorkspacePathStub.returns(projectPath);
    it('Should send exception in unsupported workspace', () => {
      getCurrentWorkspaceTypeStub.returns(lspCommon.WorkspaceType.UNKNOWN);
      workspace.getLwcTestRunnerExecutable();
      assert.calledOnce(telemetryStub);
      assert.calledWith(
        telemetryStub,
        'lwc_test_no_lwc_testrunner_found',
        'Unsupported workspace'
      );
    });
  });
});
