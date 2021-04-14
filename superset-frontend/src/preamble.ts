/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { setConfig as setHotLoaderConfig } from 'react-hot-loader';
import 'abortcontroller-polyfill/dist/abortcontroller-polyfill-only';
import moment from 'moment';
import { configure, supersetTheme } from '@superset-ui/core';
import { merge } from 'lodash';
import setupClient from './setup/setupClient';
import setupColors from './setup/setupColors';
import setupFormatters from './setup/setupFormatters';

if (process.env.WEBPACK_MODE === 'development') {
  setHotLoaderConfig({ logLevel: 'debug', trackTailUpdates: false });
}

let bootstrapData: any;
// Configure translation
if (typeof window !== 'undefined') {
  const root = document.getElementById('app');

  bootstrapData = root
    ? JSON.parse(root.getAttribute('data-bootstrap') || '{}')
    : {};
  if (bootstrapData.common && bootstrapData.common.language_pack) {
    const languagePack = bootstrapData.common.language_pack;
    configure({ languagePack });
    moment.locale(bootstrapData.common.locale);
  } else {
    configure();
  }
} else {
  configure();
}

// Setup SupersetClient
setupClient();

setupColors(
  bootstrapData?.common?.extra_categorical_color_schemes,
  bootstrapData?.common?.extra_sequential_color_schemes,
);

// Setup number formatters
setupFormatters();

export const theme = merge(
  supersetTheme,
  bootstrapData?.common?.theme_overrides ?? {},
  {
    borderRadius: 5,
    colors: {
      primary: {
        base: "#4D1476",
        dark1: "#441269",
        dark2: "#390F57",
        light1: "#AE62E4",
        light2: "#C996ED",
        light3: "#D2A8F0",
        light4: "#E8E8E8",
        light5: "#E4CBF6"
      },
      secondary: {
        base: "#858585",
        dark1: "#141414",
        dark2: "#292929",
        dark3: "#3D3D3D",
        light1: "#999999",
        light2: "#ADADAD",
        light3: "#C2C2C2",
        light4: "#D6D6D6",
        light5: "#EBEBEB"
      },
      error: {
        base: "#FF0050",
        dark1: "#B8003A",
        dark2: "#8F002D",
        light1: "#FF99B9",
        light2: "#FFD6E3"
      },
      warning: {
        base: "#FF6E00",
        dark1: "#E06100",
        dark2: "#B85000",
        light1: "#FFBA85",
        light2: "#FFD1AD",
      },
      alert: {
        base: "#FFFF66",
        dark1: "#A3A300",
        dark2: "#7A7A00",
        light1: "#FFFFAD",
        light2: "#FFFFD6",
      },
      success: {
        base: "#22E57C",
        dark1: "#11924D",
        dark2: "#0D6E3A",
        light1: "#A3F5C9",
        light2: "#C8F9DF"
      },
      info: {
        base: "#92ECF7",
        dark1: "#0DAABF",
        dark2: "#0B8899",
        light1: "#B3F1F9",
        light2: "#C6F4FA"
      }
    }
  }
);
