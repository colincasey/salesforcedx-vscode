/*
 * Copyright (c) 2019, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ConfigAggregator, ConfigFile, ConfigValue } from '@salesforce/core';
import * as path from 'path';
import {
  SF_CONFIG_FILE,
  SF_STATE_FOLDER,
  SFDX_CONFIG_FILE,
  SFDX_STATE_FOLDER
} from '../../src/constants';
import { telemetryService } from '../telemetry';
import { getRootWorkspacePath } from './index';

export enum ConfigSource {
  Local,
  Global,
  None
}

async function getConfigAggregator(): Promise<ConfigAggregator> {
  const origCurrentWorkingDirectory = process.cwd();
  const rootWorkspacePath = getRootWorkspacePath();
  // Change the current working directory to the project path,
  // so that ConfigAggregator reads the local project values
  process.chdir(rootWorkspacePath);
  const configAggregator = await ConfigAggregator.create();
  // Change the current working directory back to what it was
  // before returning
  process.chdir(origCurrentWorkingDirectory);
  return configAggregator;
}

// This class should be reworked or removed once the ConfigAggregator correctly checks
// local as well as global configs. It's also worth noting that ConfigAggregator, according
// to its docs checks local, global and environment and, for our purposes, environment may
// not be viable.

export class ConfigUtil {
  public static async getConfigSource(
    key: string
  ): Promise<ConfigAggregator.Location | undefined> {
    const configAggregator = await getConfigAggregator();
    return configAggregator.getLocation(key);
  }

  public static async getConfigValue(
    key: string,
    source?: ConfigSource.Global | ConfigSource.Local
  ): Promise<ConfigValue | undefined> {
    if (source === undefined || source === ConfigSource.Local) {
      try {
        const rootPath = getRootWorkspacePath();
        const myLocalConfig = await ConfigFile.create({
          isGlobal: false,
          rootFolder: path.join(rootPath, SFDX_STATE_FOLDER),
          filename: SFDX_CONFIG_FILE
        });
        const localValue = myLocalConfig.get(key);
        if (localValue !== undefined && localValue !== null) {
          return localValue;
        }
      } catch (err) {
        telemetryService.sendException('get_config_value_local', err.message);
        return undefined;
      }
    }
    if (source === undefined || source === ConfigSource.Global) {
      try {
        const aggregator = await ConfigAggregator.create();
        const globalValue = aggregator.getPropertyValue(key);
        if (globalValue !== undefined && globalValue !== null) {
          return globalValue;
        }
      } catch (err) {
        telemetryService.sendException('get_config_value_global', err.message);
        return undefined;
      }
    }
    return undefined;
  }

  public static async getSfConfigValue(
    key: string,
    source?: ConfigSource.Global | ConfigSource.Local
  ): Promise<ConfigValue | undefined> {
    if (source === undefined || source === ConfigSource.Local) {
      try {
        const rootPath = getRootWorkspacePath();
        const myLocalConfig = await ConfigFile.create({
          isGlobal: false,
          rootFolder: path.join(rootPath, SF_STATE_FOLDER),
          filename: SF_CONFIG_FILE
        });
        const localValue = myLocalConfig.get(key);
        if (localValue !== undefined && localValue !== null) {
          return localValue;
        }
      } catch (err) {
        telemetryService.sendException('get_config_value_local', err.message);
        return undefined;
      }
    }
    if (source === undefined || source === ConfigSource.Global) {
      try {
        const aggregator = await ConfigAggregator.create();
        const globalValue = aggregator.getPropertyValue(key);
        if (globalValue !== undefined && globalValue !== null) {
          return globalValue;
        }
      } catch (err) {
        telemetryService.sendException('get_config_value_global', err.message);
        return undefined;
      }
    }
    return undefined;
  }

  public static async getUserConfiguredApiVersion() {
    const apiVersion = await ConfigUtil.getConfigValue('apiVersion');
    return apiVersion ? String(apiVersion) : undefined;
  }
}
