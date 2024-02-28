/**
 *
 *This is the node connection provider, we will keep this
 * in seprate file so our code will clear,
 */

import DogecoinCore from "../../api/dogecoin-core-rpc";
import SystemConfig from "../../shared/system/config";

/**
 *
 * user = username (RPC)
 * password = password (RPC)
 * host = host (RPC)
 * port = port (RPC) 22555 by default
 * in seprate file so our code will clear,
 */

const DogecoinCLI = new DogecoinCore({
  username: SystemConfig.user,
  password: SystemConfig.password,
  host: SystemConfig.host,
  port: SystemConfig.port,
});

export default DogecoinCLI;
