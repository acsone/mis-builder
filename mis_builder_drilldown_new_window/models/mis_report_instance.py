# Copyright 2024 ACSONE SA/NV
# License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl).

from odoo import models


class MisReportInstance(models.Model):
    _inherit = "mis.report.instance"

    def drilldown(self, arg):
        action = super().drilldown(arg)
        if action and action.get("target"):
            action["target"] = "new"
        return action
