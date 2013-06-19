/*
 * Modbus TCP Frame Description
 *  - max. 260 Byte (ADU = 7 Byte MBAP + 253 Byte PDU)
 *  - Length field includes Unit Identifier + PDU
 *
 * <----------------------------------------------- ADU -------------------------------------------------------->
 * <---------------------------- MBAP -----------------------------------------><------------- PDU ------------->
 * +------------------------+---------------------+----------+-----------------++---------------+---------------+
 * | Transaction Identifier | Protocol Identifier | Length   | Unit Identifier || Function Code | Data          |
 * | (2 Byte)               | (2 Byte)            | (2 Byte) | (1 Byte)        || (1 Byte)      | (1 - 252 Byte |
 * +------------------------+---------------------+----------+-----------------++---------------+---------------+
 */

if (Meteor.isServer) {
   Meteor.startup(function() {
      var tel1 = new Telegram({
         name: "default-tel",
         type: ["send", "receive"],
         values: [{
               type: "Int16LE",
               offset: 0,
               name: "Transaction_Identifier",
               current: "n/a"
            }, {
               type: "Int16LE",
               offset: 2,
               name: "Protocol_Identifier",
               current: "n/a"
            }, {
               type: "Int16LE",
               offset: 4,
               name: "Length",
               current: "n/a"
            }, {
               type: "Int8",
               offset: 6,
               name: "Unit_Identifier",
               current: "n/a"
            }, {
               type: "Int16LE",
               offset: 7,
               name: "Function_Code",
               current: "n/a"
            }, {
               type: "Int8",
               offset: 8,
               count: 252,
               name: "Data",
               current: "n/a"
            }
         ]
      });

      var tel2 = new Telegram({
         name: "test-tel",
         type: ["send", "receive"],
         values: [{
               type: "Int16LE",
               offset: 0,
               name: "Transaction_Identifier",
               current: 1
            }, {
               type: "Int16LE",
               offset: 2,
               name: "Protocol_Identifier",
               current: 0
            }, {
               type: "Int16LE",
               offset: 4,
               name: "Length",
               current: 1
            }, {
               type: "Int8",
               offset: 6,
               name: "Unit_Identifier",
               current: 2
            }, {
               type: "Int16LE",
               offset: 7,
               name: "Function_Code",
               current: 3
            }, {
               type: "Int8",
               offset: 8,
               count: 252,
               name: "Data",
               current: 0
            }
         ]
      });

      var prot = new Protocol({
         name: "modbus",
         telegrams: [tel1, tel2]
      });

      if (!Protocols.findOne({
         name: "modbus"
      }))
         Meteor.call("saveProtocol", prot);

   });
}